import express, { Router } from 'express'
import type Stripe from 'stripe'
import { pool } from '../db.js'
import { verifyWebhook } from '../integrations/paymentAdapter.js'
import { indexProducts, type ProductRow } from '../integrations/searchAdapter.js'
import { sendEmail } from '../integrations/emailAdapter.js'
import { orderConfirmation, type ConfirmationOrder } from '../lib/orderConfirmation.js'

type ChangedProduct = ProductRow & { is_active: boolean }

const router = Router()

// Signaturen är räknad på de råa bytes Stripe skickade, så de får inte göras om till JSON först
router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['stripe-signature']
  let event: Stripe.Event
  try {
    event = verifyWebhook(req.body, typeof signature === 'string' ? signature : '')
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`Webhook avvisad: ${message}`)
    return res.status(400).json({ error: 'Ogiltig signatur' })
  }

  try {
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      // Kort är betalt direkt. Andra betalsätt kan bli klara senare, då kommer async_payment_succeeded.
      if (event.data.object.payment_status === 'paid') {
        const orderId = Number(event.data.object.client_reference_id)
        const changed = await markPaid(orderId)
        // null betyder att ordern redan var betald, då är både lager och mejl redan klara
        if (changed) {
          await updateSearchStock(changed)
          await sendOrderConfirmation(orderId)
        }
      }
    } else if (event.type === 'checkout.session.expired') {
      // En betald order ändras aldrig
      await pool.query(
        `UPDATE orders SET payment_status = 'Avbruten' WHERE id = $1 AND payment_status = 'Obetald'`,
        [Number(event.data.object.client_reference_id)]
      )
    }
    res.json({ received: true })
  } catch (error) {
    // 500 gör att Stripe försöker igen senare
    const message = error instanceof Error ? error.message : String(error)
    console.error(`Webhook ${event.type} misslyckades: ${message}`)
    res.status(500).json({ error: 'Kunde inte hantera händelsen' })
  }
})

// Allt eller inget: ordern blir betald, lagret minskar och varukorgen töms.
// Svarar med produkterna vars saldo ändrades, så att sökningen kan få det nya saldot.
async function markPaid(orderId: number): Promise<ChangedProduct[] | null> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    // Bara en obetald order kan bli betald. Kommer samma händelse igen ändras inga rader.
    const updated = await client.query(
      `UPDATE orders SET payment_status = 'Betald'
       WHERE id = $1 AND payment_status = 'Obetald'
       RETURNING cart_id`,
      [orderId]
    )
    if (updated.rows.length === 0) {
      await client.query('ROLLBACK')
      return null
    }

    // GREATEST ser till att saldot aldrig blir negativt om någon annan hann köpa samma vara
    const changed = await client.query<ChangedProduct>(
      `UPDATE products p
       SET stock = GREATEST(p.stock - oi.quantity, 0)
       FROM order_items oi
       WHERE oi.order_id = $1 AND oi.product_id = p.id AND p.stock IS NOT NULL
       RETURNING p.*`,
      [orderId]
    )

    await client.query('DELETE FROM cart_items WHERE cart_id = $1', [updated.rows[0].cart_id])
    await client.query('COMMIT')
    return changed.rows
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

// Körs efter COMMIT. Ett fel från Algolia ger ingen 500, ett nytt försök från Stripe hittar ändå ingen obetald order.
async function updateSearchStock(products: ChangedProduct[]) {
  const active = products.filter((product) => product.is_active)
  if (active.length === 0) return
  try {
    await indexProducts(active)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`Sökindexet fick inte det nya lagersaldot: ${message}`)
  }
}

// Körs efter COMMIT, så ordern är betald vad som än händer här. Ett fel loggas men ger aldrig 500,
// eftersom Stripe då skulle skicka händelsen igen för en order som redan är klar.
async function sendOrderConfirmation(orderId: number) {
  try {
    const result = await pool.query<ConfirmationOrder & { customer_email: string }>(
      `SELECT o.id, o.customer_name, o.customer_email, o.total_amount, o.shipping_method_name, o.shipping_price,
              json_agg(json_build_object(
                'product_title', oi.product_title,
                'unit_price', oi.unit_price,
                'quantity', oi.quantity
              ) ORDER BY oi.id) AS items
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       WHERE o.id = $1
       GROUP BY o.id`,
      [orderId]
    )
    const order = result.rows[0]
    if (!order) throw new Error('ordern finns inte')

    const { subject, html, text } = orderConfirmation(order)
    // Nyckeln hör till ordern. Försöker vi skicka samma bekräftelse igen skickar Resend inget nytt mejl.
    const id = await sendEmail({ to: order.customer_email, subject, html, text, idempotencyKey: `order-confirmation/${orderId}` })
    console.log(`Orderbekräftelse för order ${orderId} skickad, Resend-id ${id}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`Orderbekräftelsen för order ${orderId} kunde inte skickas: ${message}`)
  }
}

export default router
