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

app.put('/api/products/:id', async (req, res) => {
  try {
    const updatedProduct = await pool.query(
      `UPDATE products SET
      title = $1,
      description = $2,
      volume_ml = $3,
      price = $4,
      heat_level = $5,
      image_url = $6,
      ingredients = $7,
      energy_kj = $8,
      energy_kcal = $9,
      fat_g = $10,
      saturated_fat_g = $11,
      carbohydrate_g = $12,
      sugars_g = $13,
      protein_g = $14,
      salt_g = $15
      WHERE id = $16
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
        req.body.salt_g,
        req.params.id
      ]
    )
    if (updatedProduct.rows.length === 0) {
      return res.status(404).json({ status: 'fel', error: 'Produkten finns inte' })
    }
    res.json({ product: updatedProduct.rows[0] })
  }
  catch (error) {
    res.status(500).json({
      status: 'fel',
      error: error instanceof Error ? error.message : String(error)
    })
  }
})
// En produkt raderas inte från databasen, utan markeras som inaktiv.
// På så sätt kan vi behålla historik och undvika problem med ordrar som refererar
// till produkter som inte längre finns.
app.delete('/api/products/:id', async (req, res) => {
  try {
    const deletedProduct = await pool.query(
      'UPDATE products SET is_active = false WHERE id = $1 RETURNING *',
      [req.params.id]
    )
    if (deletedProduct.rows.length === 0) {
      return res.status(404).json({ status: 'fel', error: 'Produkten finns inte' })
    }
    res.json({ product: deletedProduct.rows[0] })
  }
  catch (error) {
    res.status(500).json({
      status: 'fel',
      error: error instanceof Error ? error.message : String(error)
    })
  }
})

export default app
