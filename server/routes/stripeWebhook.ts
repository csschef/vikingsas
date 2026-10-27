import express, { Router } from 'express'
import type Stripe from 'stripe'
import { pool } from '../db.js'
import { verifyWebhook } from '../integrations/paymentAdapter.js'

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
        await markPaid(Number(event.data.object.client_reference_id))
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

// Allt eller inget: ordern blir betald, lagret minskar och varukorgen töms
async function markPaid(orderId: number) {
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
      return
    }

    // GREATEST ser till att saldot aldrig blir negativt om någon annan hann köpa samma vara
    await client.query(
      `UPDATE products p
       SET stock = GREATEST(p.stock - oi.quantity, 0)
       FROM order_items oi
       WHERE oi.order_id = $1 AND oi.product_id = p.id AND p.stock IS NOT NULL`,
      [orderId]
    )

    await client.query('DELETE FROM cart_items WHERE cart_id = $1', [updated.rows[0].cart_id])
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export default router
