import { Router } from 'express'
import { pool } from '../db.js'

const router = Router()

router.get('/', async (_req, res) => {
  try {
    const orders = await pool.query(
      `SELECT o.id, o.customer_name, o.customer_email, o.total_amount, o.created_at, o.status,
              json_agg(json_build_object(
                'product_id', oi.product_id,
                'product_title', oi.product_title,
                'unit_price', oi.unit_price,
                'quantity', oi.quantity
              )) AS items
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       GROUP BY o.id
       ORDER BY o.created_at DESC`
    )
    res.json({ orders: orders.rows })
  } catch (error) {
    res.status(500).json({
      status: 'fel',
      error: error instanceof Error ? error.message : String(error)
    })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const order = await pool.query(
      `SELECT o.id, o.customer_name, o.customer_email, o.total_amount, o.created_at, o.status,
              json_agg(json_build_object(
                'product_id', oi.product_id,
                'product_title', oi.product_title,
                'unit_price', oi.unit_price,
                'quantity', oi.quantity
              )) AS items
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       WHERE o.id = $1
       GROUP BY o.id`,
      [req.params.id]
    )
    if (order.rows.length === 0) {
      return res.status(404).json({ status: 'fel', error: 'Ordern finns inte' })
    }
    res.json({ order: order.rows[0] })
  } catch (error) {
    res.status(500).json({
      status: 'fel',
      error: error instanceof Error ? error.message : String(error)
    })
  }
})

router.put('/:id/status', async (req, res) => {
  try {
    const updatedOrder = await pool.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [req.body.status, req.params.id]
    )
    if (updatedOrder.rows.length === 0) {
      return res.status(404).json({ status: 'fel', error: 'Ordern finns inte' })
    }
    res.json({ order: updatedOrder.rows[0] })
  } catch (error) {
    res.status(500).json({
      status: 'fel',
      error: error instanceof Error ? error.message : String(error)
    })
  }
})

export default router
