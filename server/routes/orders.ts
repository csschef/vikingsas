import { Router } from 'express'
import { pool } from '../db.js'
import { getCartId } from '../lib/cart.js'

const router = Router()

router.post('/', async (req, res) => {
  const cartId = await getCartId(req.cookies.session_id)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await client.query(
      `SELECT ci.product_id, ci.quantity, p.title, p.price
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

    const total = result.rows.reduce(
      (summa, row) => summa + Number(row.price) * row.quantity,
      0,
    )

    const order = await client.query(
      `INSERT INTO orders (customer_name, customer_email, total_amount)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [req.body.customer_name, req.body.customer_email, total]
    )
    const orderId = order.rows[0].id

    for (const row of result.rows) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_title, unit_price, quantity)
         VALUES ($1, $2, $3, $4, $5)`,
        [orderId, row.product_id, row.title, row.price, row.quantity]
      )
    }

    await client.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId])

    await client.query('COMMIT')
    res.status(201).json({ order_id: orderId })
  } catch (error) {
    await client.query('ROLLBACK')
    res.status(500).json({
      status: 'fel',
      error: error instanceof Error ? error.message : String(error),
    })
  } finally {
    client.release()
  }
})

export default router
