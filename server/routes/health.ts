import { Router } from 'express'
import { pool } from '../db.js'

const router = Router()

router.get('/', async (_req, res) => {
  try {
    const result = await pool.query('SELECT count(*) FROM products')
    res.json({ status: 'ok', products: Number(result.rows[0].count) })
  } catch (error) {
    res.status(500).json({
      status: 'fel',
      error: error instanceof Error ? error.message : String(error)
    })
  }
})

export default router
