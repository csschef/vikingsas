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
