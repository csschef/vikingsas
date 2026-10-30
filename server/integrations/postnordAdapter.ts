import { z } from 'zod'
import type { ServicePoint, ShippingCarrier } from './shippingCarrier.js'

const TIMEOUT_MS = 5000
const NUMBER_OF_SERVICE_POINTS = 5
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
// Ombud och paketboxar hämtas var för sig. Bara svenska ombudstyper, PostNord svarar 400 på andra länders.
const SERVICE_POINT_TYPES = '24,25,54'
const PARCEL_BOX_TYPES = '2'
// 17 är MyPack Home (hemleverans), 19 är MyPack Collect (ombud och paketbox)
const SERVICE_CODES = { home: '17', servicePoint: '19' }

const ServicePointsResponseSchema = z.object({
  servicePointInformationResponse: z.object({
    servicePoints: z.array(z.unknown()),
  }),
})

const ServicePointSchema = z.object({
  servicePointId: z.string(),
  name: z.string(),
  visitingAddress: z.object({
    countryCode: z.string().optional(),
    streetName: z.string(),
    streetNumber: z.string().optional(),
    postalCode: z.string(),
    city: z.string(),
  }),
  routeDistance: z.number().optional(),
  // Koordinater, öppettider och boxens krav är extra. Är de trasiga visas platsen ändå, utan dem.
  coordinates: z
    .array(z.object({ northing: z.number(), easting: z.number(), srId: z.string() }))
    .optional()
    .catch(undefined),
  openingHours: z
    .object({
      postalServices: z.array(z.object({ openDay: z.string(), openTime: z.string(), closeTime: z.string() })),
    })
    .optional()
    .catch(undefined),
  type: z
    .object({
      boxType: z.object({ pickupRequirements: z.array(z.object({ label: z.string() })).optional() }).nullable().optional(),
    })
    .optional()
    .catch(undefined),
})

// Leveranstiden svarar med en lista, och fel kommer som egna rader i ett lyckat svar
const TransitTimeResponseSchema = z.array(z.unknown())

// Lokal tid som "2026-11-03T18:00:00", och den måste finnas på riktigt. Date.UTC flyttar 30 februari till 2 mars, och då stämmer texten inte längre.
function isRealDateTime(text: string) {
  const parts = text.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/)
  if (!parts) return false
  const [year, month, day, hour, minute, second] = parts.slice(1).map(Number)
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second)).toISOString().slice(0, 19) === text
}

const LocalDateTimeSchema = z.string().refine(isRealDateTime, 'Inte ett datum och klockslag som 2026-11-03T18:00:00')

const TransitTimeRowSchema = z.object({
  timeOfArrival: LocalDateTimeSchema,
  serviceInformation: z.object({
    serviceCode: z.string(),
    additionalServices: z.array(z.unknown()).optional(),
  }),
})

const TransitTimeErrorRowSchema = z.object({
  errorMessage: z.string(),
})

const FaultsSchema = z.object({
  faults: z.array(
    z.object({
      faultCode: z.string().optional(),
      explanationText: z.string().optional(),
      paramValues: z.array(z.object({ param: z.string() })).optional(),
    }),
  ),
})

type Fault = z.infer<typeof FaultsSchema>['faults'][number]

// Felsvaren ligger på olika ställen: direkt i compositeFault för leveranstiden, inuti servicePointInformationResponse för ombuden
const TransitTimeFaultSchema = z.object({ compositeFault: FaultsSchema })
const ServicePointsFaultSchema = z.object({ servicePointInformationResponse: z.object({ compositeFault: FaultsSchema }) })

type Failure<S extends string> = { status: S; reason: string }

// Nyckeln ska aldrig kunna hamna i en logg, även om något oväntat skulle innehålla den
function mask(text: string) {
  const apiKey = process.env.POSTNORD_API_KEY
  return apiKey ? text.replaceAll(apiKey, '***') : text
}

function failure<S extends string>(status: S, reason: string): Failure<S> {
  return { status, reason: mask(reason) }
}

type PostNordReply =
  | { kind: 'ok'; body: unknown }
  | { kind: 'httpError'; status: number; body: unknown }
  | { kind: 'noAnswer'; reason: string }

// Egen hjälpfunktion i stället för fetchJson: PostNord förklarar felen i felsvarets innehåll, och kassan ska inte vänta på omförsök
async function requestPostNord(path: string, params: Record<string, string>, label: string): Promise<PostNordReply> {
  const baseUrl = process.env.POSTNORD_API_URL
  const apiKey = process.env.POSTNORD_API_KEY
  if (!baseUrl || !apiKey) {
    return { kind: 'noAnswer', reason: `${label}: POSTNORD_API_URL eller POSTNORD_API_KEY saknas i miljövariablerna` }
  }

  const url = new URL(`${baseUrl}${path}`)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  // Dokumentationen säger att nyckeln skickas i adressen, så adressen skrivs aldrig i något meddelande
  url.searchParams.set('apikey', apiKey)

  // Timeouten gäller också medan svaret läses. Bryts det någon gång är det inget svar, inte ett felaktigt svar.
  let response: Response
  let text: string
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
    text = await response.text()
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError'
    return { kind: 'noAnswer', reason: timedOut ? `${label}: inget svar inom ${TIMEOUT_MS} ms` : `${label}: anslutningen till PostNord bröts` }
  }
  const body = parseJson(text)
  return response.ok ? { kind: 'ok', body } : { kind: 'httpError', status: response.status, body }
}

// Ett svar som inte är JSON blir null, och schemat säger då att formatet är oväntat
function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

// v1 har ingen felkod på raderna, så bara texten visar att det är just ombudets id som inte finns
function isUnknownLocation(message: string, servicePointId: string) {
  const match = message.trim().match(/^requested destination location '([^']+)' not found\.?$/i)
  return match !== null && match[1].startsWith(`${servicePointId}-`)
}

function describeFaults(faults: Fault[]) {
  return faults.map((fault) => [fault.faultCode, fault.explanationText].filter(Boolean).join(' ')).join('; ') || 'ingen förklaring'
}

function httpFailure(label: string, status: number, faults: Fault[], invalidPostalCode: boolean) {
  const details = describeFaults(faults)
  if (invalidPostalCode) return failure('invalidPostalCode', `${label}: PostNord säger att postnumret inte finns (${details})`)
  // Överbelastning och timeout hos PostNord är tillfälligt, precis som 5xx
  if (status >= 500 || status === 408 || status === 429) return failure('unavailable', `${label}: PostNord svarade ${status} (${details})`)
  // Övriga 4xx kan vara fel indata eller en bugg i integrationen, inte ett driftstopp
  return failure('rejected', `${label}: PostNord avvisade anropet med ${status} (${details})`)
}

// PostNord skickar orten med versaler, "KALMAR" blir "Kalmar"
function capitalize(text: string) {
  return text.toLocaleLowerCase('sv-SE').replace(/(^|[\s-])\p{L}/gu, (match) => match.toLocaleUpperCase('sv-SE'))
}

function toServicePoint(data: z.infer<typeof ServicePointSchema>, kind: ServicePoint['kind']): ServicePoint {
  const address = data.visitingAddress
  // Dokumentationen kallar northing för longitud, men i svaren är northing latituden (56,7 för Kalmar)
  const position = data.coordinates?.find((coordinate) => coordinate.srId === 'EPSG:4326')
  return {
    id: data.servicePointId,
    kind,
    name: data.name,
    street: [address.streetName, address.streetNumber].filter(Boolean).join(' '),
    postalCode: address.postalCode,
    city: capitalize(address.city),
    // Sökningen görs alltid i Sverige, så SE gäller om PostNord inte skickar landskoden
    countryCode: address.countryCode ?? 'SE',
    distanceMeters: data.routeDistance ?? null,
    coordinates: position ? { latitude: position.northing, longitude: position.easting } : null,
    openingHours: (data.openingHours?.postalServices ?? [])
      .map((row) => ({ day: DAYS.indexOf(row.openDay.toLowerCase()) + 1, opens: row.openTime, closes: row.closeTime }))
      .filter((row) => row.day > 0),
    pickupRequirements: (data.type?.boxType?.pickupRequirements ?? []).map((requirement) => requirement.label),
  }
}

type GroupResult =
  | { status: 'ok'; servicePoints: ServicePoint[] }
  | Failure<'invalidPostalCode' | 'rejected' | 'unavailable' | 'invalidResponse'>

async function fetchGroup(postalCode: string, typeIds: string, kind: ServicePoint['kind']): Promise<GroupResult> {
  const label = kind === 'servicePoint' ? 'Ombudssökning' : 'Paketboxsökning'
  const reply = await requestPostNord(
    '/rest/businesslocation/v5/servicepoints/nearest/byaddress',
    {
      returnType: 'json',
      countryCode: 'SE',
      // PostNord vill ha postnumret utan mellanslag
      postalCode: postalCode.replace(/\s/g, ''),
      numberOfServicePoints: String(NUMBER_OF_SERVICE_POINTS),
      // Bara platser som tar emot leveranser just nu, PostNords rekommendation för kassor
      context: 'optionalservicepoint',
      typeId: typeIds,
    },
    label,
  )

  if (reply.kind === 'noAnswer') return failure('unavailable', reply.reason)
  if (reply.kind === 'httpError') {
    const parsedFaults = ServicePointsFaultSchema.safeParse(reply.body)
    const faults = parsedFaults.success ? parsedFaults.data.servicePointInformationResponse.compositeFault.faults : []
    // Ombudssökningen säger inte vilken parameter som är fel, så bara texten visar att det gäller postnumret
    const invalidPostalCode =
      reply.status === 400 &&
      faults.some((fault) => fault.faultCode === 'API-400' && fault.explanationText?.trim().toLowerCase() === 'postalcode not found')
    return httpFailure(label, reply.status, faults, invalidPostalCode)
  }

  const parsed = ServicePointsResponseSchema.safeParse(reply.body)
  if (!parsed.success) {
    return failure('invalidResponse', `${label}: oväntat format\n${z.prettifyError(parsed.error)}`)
  }

  const rows = parsed.data.servicePointInformationResponse.servicePoints
  const servicePoints: ServicePoint[] = []
  for (const row of rows) {
    const point = ServicePointSchema.safeParse(row)
    if (!point.success) {
      console.warn(mask(`${label}: hoppar över en plats med oväntat format\n${z.prettifyError(point.error)}`))
      continue
    }
    servicePoints.push(toServicePoint(point.data, kind))
  }
  // Fanns det platser men ingen klarade schemat är det svaret som är fel, inte att platser saknas
  if (rows.length > 0 && servicePoints.length === 0) {
    return failure('invalidResponse', `${label}: ingen av ${rows.length} platser hade väntat format`)
  }
  return { status: 'ok', servicePoints }
}

// Ombud och paketboxar hämtas samtidigt. Ett fel i den ena gruppen tar inte bort platserna från den andra.
export const findServicePoints: ShippingCarrier['findServicePoints'] = async (postalCode) => {
  const [servicePointGroup, parcelBoxGroup] = await Promise.all([
    fetchGroup(postalCode, SERVICE_POINT_TYPES, 'servicePoint'),
    fetchGroup(postalCode, PARCEL_BOX_TYPES, 'parcelBox'),
  ])
  const groups = [
    { kind: 'servicePoint', result: servicePointGroup },
    { kind: 'parcelBox', result: parcelBoxGroup },
  ] as const

  const servicePoints: ServicePoint[] = []
  const failures: { kind: ServicePoint['kind']; failure: Exclude<GroupResult, { status: 'ok' }> }[] = []
  for (const group of groups) {
    if (group.result.status === 'ok') servicePoints.push(...group.result.servicePoints)
    else failures.push({ kind: group.kind, failure: group.result })
  }

  // Säger PostNord att postnumret inte finns gäller det hela sökningen
  const invalid = failures.find(({ failure }) => failure.status === 'invalidPostalCode')
  if (invalid) return invalid.failure

  if (servicePoints.length > 0) {
    // Kassan får bara veta vilka grupper som saknas, så skälen loggas här
    for (const { failure } of failures) console.warn(failure.reason)
    // Set tar bort dubbletter
    return { status: 'found', servicePoints, unavailableKinds: [...new Set(failures.map(({ kind }) => kind))] }
  }
  if (failures.length === 0) {
    return { status: 'noServicePoints', reason: 'PostNord hittade inga ombud eller paketboxar för postnumret' }
  }
  // Inga platser och minst ett fel: ombudens fel går före paketboxarnas, och alla skäl följer med
  return { status: failures[0].failure.status, reason: failures.map(({ failure }) => failure.reason).join('\n') }
}

export const estimateDelivery: ShippingCarrier['estimateDelivery'] = async (request) => {
  const label = 'Leveranstid'
  const serviceCode = request.delivery === 'home' ? SERVICE_CODES.home : SERVICE_CODES.servicePoint
  // Med ett valt ombud räknas tiden till just det ombudet, annars till postnumret
  const servicePointId = request.delivery === 'servicePoint' ? request.servicePointId : undefined
  const toLocation = Boolean(servicePointId)

  const params: Record<string, string> = {
    startTime: request.handoverTime,
    serviceCodes: serviceCode,
    serviceGroup: 'SE',
    originPostCode: request.fromPostalCode.replace(/\s/g, ''),
    originCountryCode: 'SE',
    destinationCountryCode: 'SE',
  }
  if (servicePointId) {
    params.destinationLocationId = servicePointId
    params.destinationLocationType = 'servicepoint'
  } else {
    // Dokumentationen kräver gata och nummer, men API:t svarar likadant med bara postnumret
    params.destinationPostCode = request.toPostalCode.replace(/\s/g, '')
  }

  const endpoint = toLocation ? 'addresstolocation' : 'addresstoaddress'
  const reply = await requestPostNord(`/rest/transport/v1/transittime/${endpoint}`, params, label)

  if (reply.kind === 'noAnswer') return failure('unavailable', reply.reason)
  if (reply.kind === 'httpError') {
    const parsedFaults = TransitTimeFaultSchema.safeParse(reply.body)
    const faults = parsedFaults.success ? parsedFaults.data.compositeFault.faults : []
    // Leveranstiden pekar ut parametern, så här räcker de strukturerade fälten
    const invalidPostalCode =
      reply.status === 400 &&
      faults.some((fault) => fault.faultCode === 'API-009' && fault.paramValues?.some((value) => value.param === 'destinationPostCode'))
    return httpFailure(label, reply.status, faults, invalidPostalCode)
  }

  const list = TransitTimeResponseSchema.safeParse(reply.body)
  if (!list.success) {
    return failure('invalidResponse', `${label}: oväntat format\n${z.prettifyError(list.error)}`)
  }

  const arrivals: string[] = []
  const errorMessages: string[] = []
  for (const row of list.data) {
    const success = TransitTimeRowSchema.safeParse(row)
    if (success.success) {
      const service = success.data.serviceInformation
      // Bara grundtjänsten räknas. Varianter med tillägg, som paketbox eller id-kontroll, hoppas över.
      if (service.serviceCode === serviceCode && !service.additionalServices?.length) {
        arrivals.push(success.data.timeOfArrival)
      }
      continue
    }
    const error = TransitTimeErrorRowSchema.safeParse(row)
    if (error.success) {
      errorMessages.push(error.data.errorMessage)
      continue
    }
    return failure('invalidResponse', `${label}: en rad har oväntat format\n${z.prettifyError(success.error)}`)
  }

  if (arrivals.length > 0) {
    // Tidigast ankomst väljs. Tiderna har samma format, så den minsta texten är den tidigaste.
    const earliest = arrivals.reduce((best, arrival) => (arrival < best ? arrival : best))
    return { status: 'estimate', date: earliest.slice(0, 10) }
  }
  // Bara ett uttryckligt besked om att ombudets id inte finns ger invalidServicePoint, andra fel gör det inte
  if (servicePointId && errorMessages.some((message) => isUnknownLocation(message, servicePointId))) {
    return failure('invalidServicePoint', `${label}: ${errorMessages.join('; ')}`)
  }
  if (errorMessages.length > 0) {
    return failure('notSupported', `${label}: ${errorMessages.join('; ')}`)
  }
  return failure('notSupported', `${label}: grundtjänsten ${serviceCode} saknas i svaret`)
}

export const postnord: ShippingCarrier = {
  name: 'PostNord',
  findServicePoints,
  estimateDelivery,
}
