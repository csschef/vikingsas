import { Router } from 'express'
import { z } from 'zod'
import { searchProducts } from '../integrations/searchAdapter.js'

const router = Router()

// Allt i adressen är text, coerce gör om "2" till 2
const SearchQuery = z.object({
  q: z.string().trim().max(100, 'Söktexten får vara högst 100 tecken').default(''),
  page: z.coerce.number().int('page måste vara ett heltal').min(1, 'page måste vara 1 eller högre').default(1),
  pageSize: z.coerce
    .number()
    .int('pageSize måste vara ett heltal')
    .min(1, 'pageSize måste vara 1 eller högre')
    .max(50, 'pageSize får vara högst 50')
    .default(12),
})

router.get('/', async (req, res) => {
  const result = SearchQuery.safeParse(req.query)
  if (!result.success) {
    return res.status(400).json({ error: result.error.issues.map((issue) => issue.message).join(', ') })
  }

  const { q, page, pageSize } = result.data
  try {
    res.json(await searchProducts(q, page, pageSize))
  } catch (error) {
    console.error(`Sökningen misslyckades: ${error instanceof Error ? error.message : String(error)}`)
    res.status(502).json({ error: 'Sökningen fungerar inte just nu. Försök igen senare.' })
  }
})

export default router
