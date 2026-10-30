import type { DeliveryEstimateResult, ServicePoint, ServicePointsResult } from '../integrations/shippingCarrier.js'
import type { ShippingOption } from './shippingPrice.js'

// manual betyder att ombud väljs i efterhand, unverified samma sak men utan att alternativet kunde kontrolleras
export type ServicePointStatus = 'found' | 'none' | 'manual' | 'unverified'

export type QuoteOption = ShippingOption & {
  // YYYY-MM-DD, eller null när leveranstiden inte gick att få fram
  estimatedDelivery: string | null
}

export type ShippingQuote = {
  options: QuoteOption[]
  servicePoints: ServicePoint[]
  servicePointStatus: ServicePointStatus
  unavailableKinds: ServicePoint['kind'][]
}

export type LogEntry = { level: 'warn' | 'error'; message: string }

export type QuoteResult =
  | { status: 'ok'; quote: ShippingQuote; logs: LogEntry[] }
  | { status: 'invalidPostalCode'; logs: LogEntry[] }

type CarrierResult = ServicePointsResult | DeliveryEstimateResult

// Skälen går bara till serverns logg. Avvisade anrop och oväntade svar är integrationsfel, inte driftstopp.
export function logEntryFor(label: string, result: CarrierResult): LogEntry | null {
  if (result.status === 'found' || result.status === 'estimate') return null
  if (result.status === 'unavailable') return { level: 'warn', message: `PostNord svarar inte (${label}): ${result.reason}` }
  if (result.status === 'rejected' || result.status === 'invalidResponse') {
    return { level: 'error', message: `Integrationsfel mot PostNord (${label}, ${result.status}): ${result.reason}` }
  }
  return { level: 'warn', message: `PostNord (${label}, ${result.status}): ${result.reason}` }
}

function servicePointStatusFor(result: ServicePointsResult): ServicePointStatus {
  if (result.status === 'found') return 'found'
  if (result.status === 'noServicePoints') return 'none'
  if (result.status === 'unavailable') return 'manual'
  return 'unverified'
}

const dateOf = (result: DeliveryEstimateResult) => (result.status === 'estimate' ? result.date : null)

export function buildShippingQuote(input: {
  options: ShippingOption[]
  servicePoints: ServicePointsResult
  homeEstimate: DeliveryEstimateResult
  servicePointEstimate: DeliveryEstimateResult
}): QuoteResult {
  const { servicePoints, homeEstimate, servicePointEstimate } = input
  const logs = [
    logEntryFor('ombudssökning', servicePoints),
    logEntryFor('leveranstid hem', homeEstimate),
    logEntryFor('leveranstid ombud', servicePointEstimate),
  ].filter((entry) => entry !== null)

  // PostNord har uttryckligen sagt att postnumret inte finns, i någon av sökningarna
  if ([servicePoints, homeEstimate, servicePointEstimate].some((result) => result.status === 'invalidPostalCode')) {
    return { status: 'invalidPostalCode', logs }
  }

  // Bara ett uttryckligt besked om att hemleverans inte går tar bort den, aldrig ett fel i leveranstiden
  const homeOffered = homeEstimate.status !== 'notSupported'
  // Har PostNord bekräftat att inga ombud finns erbjuds aldrig ombud, även om hemleverans inte heller går
  const servicePointStatus = servicePointStatusFor(servicePoints)

  const options = input.options
    .filter((option) => (option.code === 'hem' ? homeOffered : servicePointStatus !== 'none'))
    .map((option) => ({
      ...option,
      estimatedDelivery: dateOf(option.code === 'hem' ? homeEstimate : servicePointEstimate),
    }))

  return {
    status: 'ok',
    logs,
    quote: {
      options,
      servicePoints: servicePoints.status === 'found' ? servicePoints.servicePoints : [],
      servicePointStatus,
      unavailableKinds: servicePoints.status === 'found' ? servicePoints.unavailableKinds : [],
    },
  }
}
