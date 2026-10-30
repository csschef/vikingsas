import { Router } from 'express'
import { z } from 'zod'
import { getCartId, getCartTotal } from '../lib/cart.js'
import { getShippingOptions } from '../lib/shippingMethods.js'
import { nextHandoverTime } from '../lib/handoverTime.js'
import { shopPostalCode } from '../lib/shopConfig.js'
import { buildShippingQuote, logEntryFor, type LogEntry } from '../lib/shippingQuote.js'
import { shippingCarrier } from '../integrations/shippingCarrier.js'

const router = Router()

// Samma regel som i kassan och för ordern: fem siffror, mellanslag tillåtet
const PostalCode = z
  .string()
  .trim()
  .regex(/^\d{3} ?\d{2}$/, 'Postnumret ska vara fem siffror')
  .transform((code) => code.replace(' ', ''))

const OptionsQuery = z.object({ postalCode: PostalCode })

const EstimateQuery = z.object({
  postalCode: PostalCode,
  servicePointId: z.string().regex(/^\d{1,20}$/, 'Ogiltigt ombud'),
})

function writeLogs(logs: (LogEntry | null)[]) {
  for (const entry of logs) {
    if (entry) console[entry.level](entry.message)
  }
}

// Fraktalternativ med pris, ombud och paketboxar, och beräknad leverans för ett postnummer
router.get('/options', async (req, res) => {
  const query = OptionsQuery.safeParse(req.query)
  if (!query.success) {
    return res.status(400).json({ status: 'fel', field: 'shipping_postal_code', error: query.error.issues[0].message })
  }
  const postalCode = query.data.postalCode

  // Priset räknas på varukorgen i databasen, kassan skickar aldrig något belopp
  const cartId = await getCartId(req.cookies.session_id)
  const cartTotal = await getCartTotal(cartId)
  const request = { fromPostalCode: shopPostalCode(), toPostalCode: postalCode, handoverTime: nextHandoverTime() }

  const [options, servicePoints, homeEstimate, servicePointEstimate] = await Promise.all([
    getShippingOptions(cartTotal),
    shippingCarrier.findServicePoints(postalCode),
    shippingCarrier.estimateDelivery({ ...request, delivery: 'home' }),
    shippingCarrier.estimateDelivery({ ...request, delivery: 'servicePoint' }),
  ])

  const result = buildShippingQuote({ options, servicePoints, homeEstimate, servicePointEstimate })
  writeLogs(result.logs)
  if (result.status === 'invalidPostalCode') {
    return res.status(400).json({ status: 'fel', field: 'shipping_postal_code', error: 'Postnumret finns inte. Kontrollera det.' })
  }
  res.json(result.quote)
})

// Beräknad leverans till det ombud eller den paketbox kunden har valt
router.get('/estimate', async (req, res) => {
  const query = EstimateQuery.safeParse(req.query)
  if (!query.success) {
    return res.status(400).json({ status: 'fel', error: query.error.issues[0].message })
  }

  const estimate = await shippingCarrier.estimateDelivery({
    fromPostalCode: shopPostalCode(),
    toPostalCode: query.data.postalCode,
    handoverTime: nextHandoverTime(),
    delivery: 'servicePoint',
    servicePointId: query.data.servicePointId,
  })
  writeLogs([logEntryFor('leveranstid valt ombud', estimate)])
  res.json({ estimatedDelivery: estimate.status === 'estimate' ? estimate.date : null })
})

export default router
