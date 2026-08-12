import express from 'express'
import { pool } from './db.js'

// Appen lyssnar inte själv. Lokalt gör server/dev.ts det, i produktion
// anropar Vercel den via api/index.ts.
// Routes behöver /api-prefix eftersom Vercel skickar in hela sökvägen.
const app = express()

app.use(express.json())

app.get('/api/health', async (_req, res) => {
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

app.get('/api/products', async (_req, res) => {
  try {
    const products = await pool.query('SELECT * FROM products WHERE is_active = true ORDER BY heat_level')
    res.json({ results: products.rows })
  } catch (error) {
    res.status(500).json({
      status: 'fel',
      error: error instanceof Error ? error.message : String(error)
    })
  }
})

export default app
