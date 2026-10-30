import { Router } from 'express'
import { z } from 'zod'
import { pool } from '../db.js'
import { shippingCarrier } from '../integrations/shippingCarrier.js'
import { assignServicePoint, assignmentBlocker, servicePointsProblem, type AssignableOrder } from '../lib/shippingChoice.js'
import { logEntryFor } from '../lib/shippingQuote.js'

const router = Router()

router.get('/', async (_req, res) => {
  try {
    const orders = await pool.query(
      `SELECT o.id, o.customer_name, o.customer_email, o.total_amount, o.created_at, o.status, o.payment_status,
              o.shipping_method, o.shipping_method_name, o.shipping_price, o.service_point_status,
              json_agg(json_build_object(
                'product_id', oi.product_id,
                'product_title', oi.product_title,
                'unit_price', oi.unit_price,
                'quantity', oi.quantity
              )) AS items
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       GROUP BY o.id
       ORDER BY o.created_at DESC`
    )
    res.json({ orders: orders.rows })
  } catch (error) {
    res.status(500).json({
      status: 'fel',
      error: error instanceof Error ? error.message : String(error)
    })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const order = await pool.query(
      `SELECT o.id, o.customer_name, o.customer_email, o.total_amount, o.created_at, o.status, o.payment_status,
              o.customer_phone, o.shipping_street, o.shipping_postal_code, o.shipping_city,
              o.shipping_method, o.shipping_method_name, o.shipping_price,
              o.service_point_status, o.service_point_id, o.service_point_country_code, o.service_point_name,
              o.service_point_street, o.service_point_postal_code, o.service_point_city,
              json_agg(json_build_object(
                'product_id', oi.product_id,
                'product_title', oi.product_title,
                'unit_price', oi.unit_price,
                'quantity', oi.quantity
              )) AS items
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       WHERE o.id = $1
       GROUP BY o.id`,
      [req.params.id]
    )
    if (order.rows.length === 0) {
      return res.status(404).json({ status: 'fel', error: 'Ordern finns inte' })
    }
    res.json({ order: order.rows[0] })
  } catch (error) {
    res.status(500).json({
      status: 'fel',
      error: error instanceof Error ? error.message : String(error)
    })
  }
})

router.put('/:id/status', async (req, res) => {
  try {
    const updatedOrder = await pool.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [req.body.status, req.params.id]
    )
    if (updatedOrder.rows.length === 0) {
      return res.status(404).json({ status: 'fel', error: 'Ordern finns inte' })
    }
    res.json({ order: updatedOrder.rows[0] })
  } catch (error) {
    res.status(500).json({
      status: 'fel',
      error: error instanceof Error ? error.message : String(error)
    })
  }
})

const OrderId = z.coerce.number().int().positive()
const ServicePointBody = z.object({ service_point_id: z.string().regex(/^\d{1,20}$/, 'Ogiltigt ombud') })

type OrderForAssignment = AssignableOrder & { id: number; shipping_postal_code: string }

async function findOrder(id: unknown) {
  const orderId = OrderId.safeParse(id)
  if (!orderId.success) return null
  const result = await pool.query<OrderForAssignment>(
    `SELECT id, shipping_method, service_point_status, payment_status, status, shipping_postal_code
     FROM orders WHERE id = $1`,
    [orderId.data]
  )
  return result.rows[0] ?? null
}

// Ombud och paketboxar för orderns postnummer, när ombudet ska väljas i efterhand
router.get('/:id/service-points', async (req, res) => {
  const order = await findOrder(req.params.id)
  if (!order) {
    return res.status(404).json({ status: 'fel', error: 'Ordern finns inte' })
  }
  const blocker = assignmentBlocker(order)
  if (blocker) {
    return res.status(409).json({ status: 'fel', error: blocker })
  }

  const result = await shippingCarrier.findServicePoints(order.shipping_postal_code)
  if (result.status === 'found') {
    return res.json({ servicePoints: result.servicePoints, unavailableKinds: result.unavailableKinds })
  }
  const log = logEntryFor('ombud från admin', result)
  if (log) console[log.level](log.message)
  const problem = servicePointsProblem(result)
  res.status(problem.httpStatus).json({ status: 'fel', error: problem.error })
})

router.put('/:id/service-point', async (req, res) => {
  const body = ServicePointBody.safeParse(req.body)
  if (!body.success) {
    return res.status(400).json({ status: 'fel', error: body.error.issues[0].message })
  }
  const order = await findOrder(req.params.id)
  if (!order) {
    return res.status(404).json({ status: 'fel', error: 'Ordern finns inte' })
  }
  const blocker = assignmentBlocker(order)
  if (blocker) {
    return res.status(409).json({ status: 'fel', error: blocker })
  }

  // Valet kontrolleras mot PostNord igen, så att bara ett ombud som finns för postnumret kan sparas
  const result = await shippingCarrier.findServicePoints(order.shipping_postal_code)
  const assignment = assignServicePoint(body.data.service_point_id, result)
  if (assignment.log) console[assignment.log.level](assignment.log.message)
  if (!assignment.ok) {
    return res.status(assignment.httpStatus).json({ status: 'fel', error: assignment.error })
  }

  // Villkoren står i WHERE, så kontroll och uppdatering är ett steg. Har någon annan hunnit före ändras ingen rad.
  const point = assignment.servicePoint
  const updated = await pool.query(
    `UPDATE orders
     SET service_point_status = 'Vald', service_point_id = $2, service_point_country_code = $3, service_point_name = $4,
         service_point_street = $5, service_point_postal_code = $6, service_point_city = $7
     WHERE id = $1
       AND shipping_method = 'ombud'
       AND service_point_status = 'Väntar'
       AND payment_status = 'Betald'
       AND status <> 'Återbetald'
     RETURNING service_point_status, service_point_id, service_point_country_code, service_point_name,
               service_point_street, service_point_postal_code, service_point_city`,
    [
      order.id,
      point.service_point_id,
      point.service_point_country_code,
      point.service_point_name,
      point.service_point_street,
      point.service_point_postal_code,
      point.service_point_city,
    ]
  )
  if (updated.rows.length === 0) {
    return res.status(409).json({
      status: 'fel',
      error: 'Ordern har ändrats under tiden, till exempel av en annan administratör. Ladda om sidan.',
    })
  }
  res.json({ order: updated.rows[0] })
})

export default router
