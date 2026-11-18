import { Router } from 'express'
import { pool } from '../db.js'

const router = Router()

// Bara den inloggade kundens egna ordrar. Kundens id kommer från sessionen, aldrig från webbläsaren.
// Avbrutna köp visas inte, de blev aldrig någon beställning.
router.get('/orders', async (req, res) => {
  const result = await pool.query(
    `SELECT o.id, o.created_at, o.total_amount, o.status, o.payment_status,
            o.shipping_method_name, o.shipping_price,
            json_agg(json_build_object(
              'product_title', oi.product_title,
              'unit_price', oi.unit_price,
              'quantity', oi.quantity
            ) ORDER BY oi.id) AS items
     FROM orders o
     JOIN order_items oi ON oi.order_id = o.id
     WHERE o.customer_id = $1 AND o.payment_status <> 'Avbruten'
     GROUP BY o.id
     ORDER BY o.created_at DESC`,
    [req.session.customerId]
  )
  res.json({ orders: result.rows })
})

export default router
