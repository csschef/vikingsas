import { Router } from 'express'
import { pool } from '../db.js'

const router = Router()

router.get('/', async (_req, res) => {
  try {
    const products = await pool.query('SELECT * FROM products ORDER BY heat_level')
    res.json({ products: products.rows })
  } catch (error) {
    res.status(500).json({
      status: 'fel',
      error: error instanceof Error ? error.message : String(error)
    })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id])
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'fel', error: 'Produkten finns inte' })
    }
    res.json({ product: result.rows[0] })
  } catch (error) {
    res.status(500).json({
      status: 'fel',
      error: error instanceof Error ? error.message : String(error)
    })
  }
})

router.post('/', async (req, res) => {
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

router.put('/:id', async (req, res) => {
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
      salt_g = $15,
      is_active = $16
      WHERE id = $17
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
        req.body.is_active,
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
router.put('/:id/status', async (req, res) => {
  try {
    const updatedProduct = await pool.query(
      'UPDATE products SET is_active = $1 WHERE id = $2 RETURNING *',
      [req.body.is_active, req.params.id]
    )
    if (updatedProduct.rows.length === 0) {
      return res.status(404).json({ status: 'fel', error: 'Produkten finns inte' })
    }
    res.json({ product: updatedProduct.rows[0] })
  } catch (error) {
    res.status(500).json({
      status: 'fel',
      error: error instanceof Error ? error.message : String(error)
    })
  }
})

export default router
