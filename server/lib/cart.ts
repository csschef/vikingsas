import { pool } from '../db.js'

export async function getCartId(sessionId: string) {
  const result = await pool.query('SELECT id FROM carts WHERE session_id = $1', [sessionId])
  if (result.rows.length > 0) {
    return result.rows[0].id
  } else {
    const insertResult = await pool.query('INSERT INTO carts (session_id) VALUES ($1) RETURNING id', [sessionId])
    return insertResult.rows[0].id
  }
}

// Summan räknas med dagens priser i databasen, aldrig med priser från webbläsaren
export async function getCartTotal(cartId: number) {
  const result = await pool.query(
    `SELECT COALESCE(SUM(p.price * ci.quantity), 0) AS total
     FROM cart_items ci
     JOIN products p ON ci.product_id = p.id
     WHERE ci.cart_id = $1`,
    [cartId]
  )
  return Number(result.rows[0].total)
}
