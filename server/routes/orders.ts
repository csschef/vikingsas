import { Router } from 'express'
import { z } from 'zod'
import { pool } from '../db.js'
import { getCartId } from '../lib/cart.js'
import { createCheckoutSession, type CheckoutItem } from '../integrations/paymentAdapter.js'

const router = Router()

// Kassan kollar samma sak, men det går att runda webbläsaren, så servern kollar igen
const CheckoutBody = z.object({
  customer_name: z.string().trim().min(1, 'Fyll i namn'),
  customer_email: z.email('Fyll i en giltig e-postadress'),
  customer_phone: z.string().trim().regex(/^[0-9 +-]{7,20}$/, 'Fyll i ett giltigt telefonnummer'),
  shipping_street: z.string().trim().min(1, 'Fyll i gatuadress'),
  // "123 45" sparas som "12345"
  shipping_postal_code: z
    .string()
    .trim()
    .regex(/^\d{3} ?\d{2}$/, 'Postnumret ska vara fem siffror')
    .transform((code) => code.replace(' ', '')),
  shipping_city: z.string().trim().min(1, 'Fyll i ort'),
})

router.post('/', async (req, res) => {
  const body = CheckoutBody.safeParse(req.body)
  if (!body.success) {
    return res.status(400).json({
      status: 'fel',
      error: body.error.issues.map((issue) => issue.message).join(', '),
    })
  }
  const customer = body.data

  const cartId = await getCartId(req.cookies.session_id)
  const client = await pool.connect()
  let orderId: number
  let items: CheckoutItem[]
  try {
    await client.query('BEGIN')
    const result = await client.query(
      `SELECT ci.product_id, ci.quantity, p.title, p.price, p.stock
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.cart_id = $1
       ORDER BY ci.id`,
      [cartId]
    )

    if (result.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(400).json({ status: 'fel', error: 'Varukorgen är tom' })
    }

    // Tomt lagersaldo räknas som slut i lager
    const outOfStock = result.rows.find((row) => row.stock === null || row.stock < row.quantity)
    if (outOfStock) {
      await client.query('ROLLBACK')
      return res.status(400).json({
        status: 'fel',
        error: `Det finns inte tillräckligt många av ${outOfStock.title} i lager`,
      })
    }

    const total = result.rows.reduce(
      (summa, row) => summa + Number(row.price) * row.quantity,
      0,
    )

    const order = await client.query(
      `INSERT INTO orders (customer_name, customer_email, customer_phone,
                           shipping_street, shipping_postal_code, shipping_city, total_amount, cart_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        customer.customer_name,
        customer.customer_email,
        customer.customer_phone,
        customer.shipping_street,
        customer.shipping_postal_code,
        customer.shipping_city,
        total,
        cartId,
      ]
    )
    orderId = order.rows[0].id

    for (const row of result.rows) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_title, unit_price, quantity)
         VALUES ($1, $2, $3, $4, $5)`,
        [orderId, row.product_id, row.title, row.price, row.quantity]
      )
    }

    await client.query('COMMIT')
    items = result.rows
  } catch (error) {
    await client.query('ROLLBACK')
    return res.status(500).json({
      status: 'fel',
      error: error instanceof Error ? error.message : String(error),
    })
  } finally {
    client.release()
  }

  // Ordern är nu sparad som obetald. Först därefter pratar vi med Stripe.
  // Varukorgen töms inte här, det gör webhooken när betalningen är klar.
  try {
    const session = await createCheckoutSession(orderId, items, customer.customer_email)
    await pool.query('UPDATE orders SET stripe_session_id = $1 WHERE id = $2', [session.sessionId, orderId])
    res.status(201).json({ order_id: orderId, clientSecret: session.clientSecret })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`Betalningen för order ${orderId} kunde inte startas: ${message}`)
    res.status(502).json({
      status: 'fel',
      error: 'Betalningen kunde inte startas just nu. Försök igen om en stund.',
    })
  }
})

// Bekräftelsesidan hämtar ordern med Stripes sessions-id.
// Det är långt och slumpat, så ingen kan gissa sig fram till någon annans order.
router.get('/session/:sessionId', async (req, res) => {
  try {
    const order = await pool.query(
      `SELECT o.id, o.total_amount, o.payment_status, o.created_at,
              json_agg(json_build_object(
                'product_title', oi.product_title,
                'unit_price', oi.unit_price,
                'quantity', oi.quantity
              )) AS items
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       WHERE o.stripe_session_id = $1
       GROUP BY o.id`,
      [req.params.sessionId]
    )
    if (order.rows.length === 0) {
      return res.status(404).json({ status: 'fel', error: 'Ordern finns inte' })
    }
    res.json({ order: order.rows[0] })
  } catch (error) {
    res.status(500).json({
      status: 'fel',
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

export default router
