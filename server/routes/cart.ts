import { Router } from 'express'
import { pool } from '../db.js'
import { getCartId } from '../lib/cart.js'

const router = Router()

router.post('/', async (req, res) => {
  try {
    const sessionId = req.cookies.session_id
    if (!sessionId) {
      return res.status(400).json({ status: 'fel', error: 'Ingen session' })
    }
    const cartId = await getCartId(sessionId)
    const { product_id, quantity } = req.body
    const result = await pool.query(
      `INSERT INTO cart_items (cart_id, product_id, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (cart_id, product_id) DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity
       RETURNING *`,
      [cartId, product_id, quantity]
    )
    res.status(201).json({ cart_item: result.rows[0] })
  } catch (error) {
    res.status(500).json({
      status: 'fel',
      error: error instanceof Error ? error.message : String(error)
    })
  }
})

router.get('/', async (req, res) => {
  try {
    const sessionId = req.cookies.session_id
    if (!sessionId) {
      return res.status(400).json({ status: 'fel', error: 'Ingen session' })
    }
    const cartId = await getCartId(sessionId)
    const result = await pool.query(
      `SELECT ci.id, ci.product_id, ci.quantity, p.title, p.price, p.image_url
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.cart_id = $1
       ORDER BY ci.id`,
      [cartId]
    )
    res.json({ cart_items: result.rows })
  } catch (error) {
    res.status(500).json({
      status: 'fel',
      error: error instanceof Error ? error.message : String(error)
    })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const cartId = await getCartId(req.cookies.session_id)
    const { quantity } = req.body

    if (quantity < 1) {
      const removed = await pool.query(
        'DELETE FROM cart_items WHERE id = $1 AND cart_id = $2 RETURNING *',
        [req.params.id, cartId]
      )
      if (removed.rows.length === 0) {
        return res.status(404).json({ status: 'fel', error: 'Varan finns inte i varukorgen' })
      }
      return res.json({ cart_item: removed.rows[0] })
    }

    const result = await pool.query(
      'UPDATE cart_items SET quantity = $1 WHERE id = $2 AND cart_id = $3 RETURNING *',
      [quantity, req.params.id, cartId]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'fel', error: 'Varan finns inte i varukorgen' })
    }
    res.json({ cart_item: result.rows[0] })
  } catch (error) {
    res.status(500).json({
      status: 'fel',
      error: error instanceof Error ? error.message : String(error)
    })
  }
})

export default router
