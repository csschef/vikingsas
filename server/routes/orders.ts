import { Router } from 'express'
import { z } from 'zod'
import { pool } from '../db.js'
import { getCartId } from '../lib/cart.js'
import { createCheckoutSession } from '../integrations/paymentAdapter.js'
import { shippingCarrier } from '../integrations/shippingCarrier.js'
import { nextHandoverTime } from '../lib/handoverTime.js'
import { shopPostalCode } from '../lib/shopConfig.js'
import { getShippingMethods } from '../lib/shippingMethods.js'
import { calculateShipping } from '../lib/shippingPrice.js'
import { buildPaymentLines, itemsTotal, type PaymentLine } from '../lib/orderTotals.js'
import { checkHomeDelivery, chooseServicePoint, type ShippingChoice } from '../lib/shippingChoice.js'

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
  // Kassan skickar fraktsätt och ombud, aldrig något pris
  shipping_method: z.enum(['ombud', 'hem'], 'Välj ett fraktsätt'),
  service_point_id: z.string().regex(/^\d{1,20}$/, 'Ogiltigt ombud').optional(),
})

type Customer = z.infer<typeof CheckoutBody>

// Görs innan ordern skapas, så att databastransaktionen aldrig väntar på PostNord
async function checkShipping(customer: Customer): Promise<ShippingChoice> {
  if (customer.shipping_method === 'hem') {
    const estimate = await shippingCarrier.estimateDelivery({
      fromPostalCode: shopPostalCode(),
      toPostalCode: customer.shipping_postal_code,
      handoverTime: nextHandoverTime(),
      delivery: 'home',
    })
    return checkHomeDelivery(estimate)
  }
  const servicePoints = await shippingCarrier.findServicePoints(customer.shipping_postal_code)
  return chooseServicePoint(customer.service_point_id, servicePoints)
}

router.post('/', async (req, res) => {
  const body = CheckoutBody.safeParse(req.body)
  if (!body.success) {
    return res.status(400).json({
      status: 'fel',
      error: body.error.issues.map((issue) => issue.message).join(', '),
    })
  }
  const customer = body.data

  const choice = await checkShipping(customer)
  if (choice.log) console[choice.log.level](choice.log.message)
  if (!choice.ok) {
    return res.status(400).json({ status: 'fel', field: choice.field, error: choice.error })
  }

  // Pris och gräns för fri frakt kommer från databasen
  const method = (await getShippingMethods()).find((candidate) => candidate.code === customer.shipping_method)
  if (!method) {
    return res.status(400).json({ status: 'fel', field: 'shipping_method', error: 'Fraktsättet finns inte' })
  }

  const cartId = await getCartId(req.cookies.session_id)
  const client = await pool.connect()
  let orderId: number
  let lines: PaymentLine[]
  let totalOre: number
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

    // Fraktpriset räknas på varornas summa. Samma rader ger både orderns summa och beloppet i Stripe.
    const shipping = calculateShipping(method, itemsTotal(result.rows))
    const payment = buildPaymentLines(result.rows, { name: method.name, price: shipping.price })
    lines = payment.lines
    totalOre = payment.totalOre
    const servicePoint = choice.servicePoint

    const order = await client.query(
      `INSERT INTO orders (customer_name, customer_email, customer_phone,
                           shipping_street, shipping_postal_code, shipping_city, total_amount, cart_id,
                           shipping_method, shipping_method_name, shipping_price,
                           service_point_status, service_point_id, service_point_country_code, service_point_name,
                           service_point_street, service_point_postal_code, service_point_city)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       RETURNING id`,
      [
        customer.customer_name,
        customer.customer_email,
        customer.customer_phone,
        customer.shipping_street,
        customer.shipping_postal_code,
        customer.shipping_city,
        totalOre / 100,
        cartId,
        method.code,
        method.name,
        shipping.price,
        servicePoint.service_point_status,
        servicePoint.service_point_id,
        servicePoint.service_point_country_code,
        servicePoint.service_point_name,
        servicePoint.service_point_street,
        servicePoint.service_point_postal_code,
        servicePoint.service_point_city,
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
    const session = await createCheckoutSession(orderId, lines, customer.customer_email)
    // Stripes summa ska vara exakt orderns. Annars betalar kunden något annat än det ordern säger.
    if (session.amountTotal !== totalOre) {
      throw new Error(`Stripe räknade ${session.amountTotal} öre men ordern är ${totalOre} öre`)
    }
    await pool.query('UPDATE orders SET stripe_session_id = $1 WHERE id = $2', [session.sessionId, orderId])
    res.status(201).json({
      order_id: orderId,
      clientSecret: session.clientSecret,
      servicePointStatus: choice.servicePoint.service_point_status,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`Betalningen för order ${orderId} kunde inte startas: ${message}`)
    // Ordern kan aldrig betalas, så den markeras avbruten och ligger inte kvar som obetald med ombud som väntar
    await pool
      .query(`UPDATE orders SET payment_status = 'Avbruten' WHERE id = $1 AND payment_status = 'Obetald'`, [orderId])
      .catch((updateError) => console.error(`Order ${orderId} kunde inte markeras avbruten: ${String(updateError)}`))
    res.status(502).json({
      status: 'fel',
      error: 'Betalningen kunde inte startas just nu. Försök igen om en stund.',
    })
  }
})

// Stripes sessions-id, till exempel cs_test_a1B2c3. Annat svarar som en order som inte finns.
const StripeSessionId = z.string().regex(/^cs_[A-Za-z0-9_]{10,255}$/)

// Bekräftelsesidan hämtar ordern med Stripes sessions-id. Id:t står i adressen och kan hamna i historiken,
// så ordern måste också höra till varukorgen i besökarens kaka. Svaret har inga personuppgifter.
router.get('/session/:sessionId', async (req, res) => {
  const sessionId = StripeSessionId.safeParse(req.params.sessionId)
  if (!sessionId.success) {
    return res.status(404).json({ status: 'fel', error: 'Ordern finns inte' })
  }
  try {
    const order = await pool.query(
      `SELECT o.id, o.total_amount, o.payment_status, o.created_at,
              o.shipping_method, o.shipping_method_name, o.shipping_price, o.service_point_status,
              o.service_point_name, o.service_point_street, o.service_point_postal_code, o.service_point_city,
              json_agg(json_build_object(
                'product_title', oi.product_title,
                'unit_price', oi.unit_price,
                'quantity', oi.quantity
              )) AS items
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       JOIN carts c ON c.id = o.cart_id
       WHERE o.stripe_session_id = $1 AND c.session_id = $2
       GROUP BY o.id`,
      [sessionId.data, req.cookies.session_id]
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
