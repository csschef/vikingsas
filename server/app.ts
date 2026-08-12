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
    res.json({ products: products.rows })
  } catch (error) {
    res.status(500).json({
      status: 'fel',
      error: error instanceof Error ? error.message : String(error)
    })
  }
})

app.post('/api/products', async (req, res) => {
  try {
    const newProduct = await pool.query(
      `INSERT INTO products (
      title,
      description,
      volume_ml,
      price,
      heat_level,
      image_url,
      ingredients,
      energy_kj,
      energy_kcal,
      fat_g,
      saturated_fat_g,
      carbohydrate_g,
      sugars_g,
      protein_g,
      salt_g)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        req.body.title,
        req.body.description,
        req.body.volume_ml,
        req.body.price,
        req.body.heat_level,
        req.body.image_url,
        req.body.ingredients,
        req.body.energy_kj,
        req.body.energy_kcal,
        req.body.fat_g,
        req.body.saturated_fat_g,
        req.body.carbohydrate_g,
        req.body.sugars_g,
        req.body.protein_g,
        req.body.salt_g
      ]
    )
    res.status(201).json({ product: newProduct.rows[0] })
  }
  catch (error) {
    res.status(500).json({
      status: 'fel',
      error: error instanceof Error ? error.message : String(error)
    })
  }
})

export default app
