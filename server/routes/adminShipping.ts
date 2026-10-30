import { Router } from 'express'
import { z } from 'zod'
import { pool } from '../db.js'
import { getShippingMethods } from '../lib/shippingMethods.js'
import { ShippingMethodUpdate } from '../lib/shippingPrice.js'

const router = Router()

const Code = z.enum(['ombud', 'hem'])

router.get('/', async (_req, res) => {
  res.json({ methods: await getShippingMethods() })
})

// Nya priser gäller nya ordrar. Gamla ordrar har sin egen kopia av fraktpriset.
router.put('/:code', async (req, res) => {
  const code = Code.safeParse(req.params.code)
  if (!code.success) {
    return res.status(404).json({ status: 'fel', error: 'Fraktsättet finns inte' })
  }
  const body = ShippingMethodUpdate.safeParse(req.body)
  if (!body.success) {
    // Ett fel per fält, så att formuläret kan visa det under rätt fält
    const errors: Record<string, string> = {}
    for (const issue of body.error.issues) {
      const field = String(issue.path[0])
      errors[field] ??= issue.message
    }
    return res.status(400).json({ status: 'fel', error: 'Kontrollera fälten', errors })
  }

  const updated = await pool.query(
    `UPDATE shipping_methods SET name = $2, price = $3, free_from = $4
     WHERE code = $1
     RETURNING code, name, price, free_from`,
    [code.data, body.data.name, body.data.price, body.data.free_from]
  )
  if (updated.rows.length === 0) {
    return res.status(404).json({ status: 'fel', error: 'Fraktsättet finns inte' })
  }
  res.json({ method: updated.rows[0] })
})

export default router
