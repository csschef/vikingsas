import { Router } from 'express'
import { getRates } from '../integrations/currencyAdapter.js'

const router = Router()

router.get('/rates', async (_req, res) => {
  try {
    const rates = await getRates()
    res.json(rates)
  } catch (error) {
    console.error('Kunde inte hämta valutakurser:', error)
    res.status(502).json({ status: 'fel', error: 'Valutakurserna går inte att hämta just nu' })
  }
})

export default router
