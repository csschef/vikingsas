import { Router } from 'express'
import { pool } from '../db.js'
import { indexProducts } from '../integrations/searchAdapter.js'

const router = Router()

// Skickar alla aktiva produkter till Algolia. Behövs första gången och om indexet hamnat efter databasen.
router.post('/index', async (_req, res) => {
  const result = await pool.query('SELECT * FROM products WHERE is_active = true')
  try {
    const indexed = await indexProducts(result.rows)
    res.json({ indexed })
  } catch (error) {
    console.error(`Kunde inte skicka produkterna till Algolia: ${error instanceof Error ? error.message : String(error)}`)
    res.status(502).json({ error: 'Kunde inte uppdatera sökindexet. Försök igen senare.' })
  }
})

export default router
