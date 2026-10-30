import type { DeliveryEstimateResult, ServicePoint, ServicePointsResult } from '../integrations/shippingCarrier.js'
import { logEntryFor, type LogEntry } from './shippingQuote.js'

// Ombudsfälten på ordern, som en ögonblicksbild. Vid hemleverans är alla null.
export type ServicePointSnapshot = {
  service_point_status: 'Vald' | 'Väntar' | null
  service_point_id: string | null
  service_point_country_code: string | null
  service_point_name: string | null
  service_point_street: string | null
  service_point_postal_code: string | null
  service_point_city: string | null
}

export type ShippingChoice =
  | { ok: true; servicePoint: ServicePointSnapshot; log: LogEntry | null }
  | { ok: false; field: 'shipping_postal_code' | 'shipping_method' | 'service_point_id'; error: string; log: LogEntry | null }

const noServicePoint: ServicePointSnapshot = {
  service_point_status: null,
  service_point_id: null,
  service_point_country_code: null,
  service_point_name: null,
  service_point_street: null,
  service_point_postal_code: null,
  service_point_city: null,
}

const waiting: ServicePointSnapshot = { ...noServicePoint, service_point_status: 'Väntar' }

function chosen(point: ServicePoint): ServicePointSnapshot {
  return {
    service_point_status: 'Vald',
    service_point_id: point.id,
    service_point_country_code: point.countryCode,
    service_point_name: point.name,
    service_point_street: point.street,
    service_point_postal_code: point.postalCode,
    service_point_city: point.city,
  }
}

const INVALID_POSTAL_CODE = 'Postnumret finns inte. Kontrollera det.'

// Ombud vid ordern. Bara när PostNord inte kunde kontrollera blir det Väntar, aldrig när PostNord har sagt nej.
export function chooseServicePoint(servicePointId: string | undefined, result: ServicePointsResult): ShippingChoice {
  const log = logEntryFor('ombud vid order', result)

  if (result.status === 'invalidPostalCode') {
    return { ok: false, field: 'shipping_postal_code', error: INVALID_POSTAL_CODE, log }
  }
  // PostNord har kontrollerat och bekräftat att inga ombud finns, så ombud går inte att välja
  if (result.status === 'noServicePoints') {
    return { ok: false, field: 'shipping_method', error: 'Det finns inga ombud eller paketboxar för ditt postnummer. Välj hemleverans.', log }
  }
  // Tekniska fel och avvisade anrop: ombudet väljs i efterhand
  if (result.status !== 'found') {
    return { ok: true, servicePoint: waiting, log }
  }

  if (!servicePointId) {
    return { ok: false, field: 'service_point_id', error: 'Välj ett ombud eller en paketbox.', log }
  }
  const point = result.servicePoints.find((candidate) => candidate.id === servicePointId)
  if (point) {
    return { ok: true, servicePoint: chosen(point), log }
  }
  // Ombudet kan finnas i en grupp som inte svarade, så valet går varken att godkänna eller avvisa
  if (result.unavailableKinds.length > 0) {
    return {
      ok: true,
      servicePoint: waiting,
      log: { level: 'warn', message: `Valt ombud ${servicePointId} kunde inte kontrolleras, ${result.unavailableKinds.join(' och ')} svarade inte` },
    }
  }
  return { ok: false, field: 'service_point_id', error: 'Det valda ombudet finns inte för ditt postnummer. Välj ett annat.', log }
}

// Det som avgör om admin får välja ombud. Samma villkor står i SQL:en som sparar valet.
export type AssignableOrder = {
  shipping_method: string | null
  service_point_status: string | null
  payment_status: string
  status: string
}

// Bara betalda ordrar som ska till ombud och väntar på ett. Avbrutna och återbetalda ordrar ska inte skickas.
export function assignmentBlocker(order: AssignableOrder): string | null {
  if (order.shipping_method !== 'ombud') return 'Ordern ska inte till ett ombud.'
  if (order.service_point_status !== 'Väntar') return 'Ordern har redan ett ombud.'
  if (order.payment_status !== 'Betald') return 'Ordern är inte betald.'
  if (order.status === 'Återbetald') return 'Ordern är återbetald.'
  return null
}

type AdminProblem = { httpStatus: 400 | 502; error: string }

// Felen till admin när PostNord inte svarade med ombud
export function servicePointsProblem(result: Exclude<ServicePointsResult, { status: 'found' }>): AdminProblem {
  if (result.status === 'invalidPostalCode') {
    return { httpStatus: 400, error: 'Postnumret på ordern finns inte enligt PostNord. Kontakta kunden.' }
  }
  if (result.status === 'noServicePoints') {
    return { httpStatus: 400, error: 'Det finns inga ombud för orderns postnummer.' }
  }
  if (result.status === 'unavailable') {
    return { httpStatus: 502, error: 'PostNord svarar inte just nu. Försök igen senare.' }
  }
  return { httpStatus: 502, error: 'Ombuden kunde inte kontrolleras just nu. Försök igen senare.' }
}

export type Assignment =
  | { ok: true; servicePoint: ServicePointSnapshot; log: LogEntry | null }
  | ({ ok: false; log: LogEntry | null } & AdminProblem)

// När admin väljer ombud i efterhand. Kan valet inte kontrolleras sparas det inte, ordern står kvar som Väntar.
export function assignServicePoint(servicePointId: string, result: ServicePointsResult): Assignment {
  const log = logEntryFor('ombud från admin', result)
  if (result.status !== 'found') {
    return { ok: false, log, ...servicePointsProblem(result) }
  }

  const point = result.servicePoints.find((candidate) => candidate.id === servicePointId)
  if (point) {
    return { ok: true, servicePoint: chosen(point), log }
  }
  if (result.unavailableKinds.length > 0) {
    return { ok: false, httpStatus: 502, error: 'Alla ombud kunde inte kontrolleras just nu. Försök igen senare.', log }
  }
  return { ok: false, httpStatus: 400, error: 'Ombudet finns inte för orderns postnummer.', log }
}

// Hemleverans vid ordern. Bara ett uttryckligt besked från PostNord stoppar köpet, aldrig ett tekniskt fel.
export function checkHomeDelivery(result: DeliveryEstimateResult): ShippingChoice {
  const log = logEntryFor('hemleverans vid order', result)
  if (result.status === 'invalidPostalCode') {
    return { ok: false, field: 'shipping_postal_code', error: INVALID_POSTAL_CODE, log }
  }
  if (result.status === 'notSupported') {
    return { ok: false, field: 'shipping_method', error: 'Hemleverans går inte till ditt postnummer. Välj ombud eller paketbox.', log }
  }
  return { ok: true, servicePoint: noServicePoint, log }
}
