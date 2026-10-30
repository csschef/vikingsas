import { z } from 'zod'
import { fetchJson } from '../lib/fetchJson.js'
import type { ServicePoint, ShippingCarrier } from './shippingCarrier.js'

const NUMBER_OF_SERVICE_POINTS = 5
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
// Ombud och paketboxar hämtas var för sig. Bara svenska ombudstyper, PostNord svarar 400 på andra länders.
const SERVICE_POINT_TYPES = '24,25,54'
const PARCEL_BOX_TYPES = '2'

const PostNordServicePointsResponseSchema = z.object({
  servicePointInformationResponse: z.object({
    servicePoints: z.array(z.unknown()),
  }),
})

const PostNordServicePointSchema = z.object({
  servicePointId: z.string(),
  name: z.string(),
  visitingAddress: z.object({
    streetName: z.string(),
    streetNumber: z.string().optional(),
    postalCode: z.string(),
    city: z.string(),
  }),
  routeDistance: z.number().optional(),
  // Koordinater, öppettider och boxens krav är extra. Är de trasiga visas ombudet ändå, utan dem.
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

const PostNordTransitTimeResponseSchema = z.object({
  transitTimeResponse: z.object({
    transitTimes: z.array(z.object({ deliveryDate: z.string() })).min(1),
  }),
})

// PostNord skickar orten med versaler, "KALMAR" blir "Kalmar"
function capitalize(text: string) {
  return text.toLocaleLowerCase('sv-SE').replace(/(^|[\s-])\p{L}/gu, (match) => match.toLocaleUpperCase('sv-SE'))
}

// Nycklarna läses först när de behövs, så att resten av servern startar även om de saknas
function getConfig() {
  const baseUrl = process.env.POSTNORD_API_URL
  const apiKey = process.env.POSTNORD_API_KEY
  if (!baseUrl || !apiKey) {
    throw new Error('POSTNORD_API_URL eller POSTNORD_API_KEY saknas i miljövariablerna')
  }
  return { baseUrl, apiKey }
}

// Dokumentationen säger att nyckeln skickas i adressen, så den tas bort ur felmeddelandet innan det kan hamna i en logg
async function fetchPostNord(url: URL, apiKey: string) {
  url.searchParams.set('apikey', apiKey)
  try {
    return await fetchJson(url.toString())
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`PostNord svarade inte: ${message.replaceAll(apiKey, '***')}`)
  }
}

async function fetchNearest(postalCode: string, typeIds: string, kind: ServicePoint['kind']) {
  const { baseUrl, apiKey } = getConfig()

  const url = new URL(`${baseUrl}/rest/businesslocation/v5/servicepoints/nearest/byaddress`)
  url.searchParams.set('returnType', 'json')
  url.searchParams.set('countryCode', 'SE')
  // PostNord vill ha postnumret utan mellanslag
  url.searchParams.set('postalCode', postalCode.replace(/\s/g, ''))
  url.searchParams.set('numberOfServicePoints', String(NUMBER_OF_SERVICE_POINTS))
  // Bara platser som tar emot leveranser just nu, PostNords rekommendation för kassor
  url.searchParams.set('context', 'optionalservicepoint')
  url.searchParams.set('typeId', typeIds)

  const data = await fetchPostNord(url, apiKey)
  const parsed = PostNordServicePointsResponseSchema.safeParse(data)
  if (!parsed.success) {
    throw new Error(`PostNord svarade i ett oväntat format:\n${z.prettifyError(parsed.error)}`)
  }

  // Ett trasigt ombud hoppas över, resten visas ändå
  const servicePoints: ServicePoint[] = []
  for (const row of parsed.data.servicePointInformationResponse.servicePoints) {
    const point = PostNordServicePointSchema.safeParse(row)
    if (!point.success) {
      console.warn(`Hoppar över ett ombud från PostNord:\n${z.prettifyError(point.error)}`)
      continue
    }
    const address = point.data.visitingAddress
    // Dokumentationen kallar northing för longitud, men i svaren är northing latituden (56,7 för Kalmar)
    const position = point.data.coordinates?.find((coordinate) => coordinate.srId === 'EPSG:4326')
    servicePoints.push({
      id: point.data.servicePointId,
      kind,
      name: point.data.name,
      street: [address.streetName, address.streetNumber].filter(Boolean).join(' '),
      postalCode: address.postalCode,
      city: capitalize(address.city),
      distanceMeters: point.data.routeDistance ?? null,
      coordinates: position ? { latitude: position.northing, longitude: position.easting } : null,
      openingHours: (point.data.openingHours?.postalServices ?? [])
        .map((row) => ({ day: DAYS.indexOf(row.openDay.toLowerCase()) + 1, opens: row.openTime, closes: row.closeTime }))
        .filter((row) => row.day > 0),
      pickupRequirements: (point.data.type?.boxType?.pickupRequirements ?? []).map((requirement) => requirement.label),
    })
  }
  return servicePoints
}

// Ombud och paketboxar hämtas samtidigt. Svarar PostNord inte på något av anropen räknas det som att PostNord inte svarar.
export const findServicePoints: ShippingCarrier['findServicePoints'] = async (postalCode) => {
  const [servicePoints, parcelBoxes] = await Promise.all([
    fetchNearest(postalCode, SERVICE_POINT_TYPES, 'servicePoint'),
    fetchNearest(postalCode, PARCEL_BOX_TYPES, 'parcelBox'),
  ])
  return [...servicePoints, ...parcelBoxes]
}

export const estimateDelivery: ShippingCarrier['estimateDelivery'] = async (fromPostalCode, toPostalCode) => {
  const { baseUrl, apiKey } = getConfig()
  // Dagens datum i Sverige, servern på Vercel går på UTC. sv-SE skriver datum som YYYY-MM-DD.
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Stockholm' })

  const url = new URL(`${baseUrl}/rest/transport/v1/transittime/getTransitTimeInformation.json`)
  url.searchParams.set('dateOfDeparture', today)
  url.searchParams.set('serviceGroupCode', 'SE')
  url.searchParams.set('fromAddressPostalCode', fromPostalCode.replace(/\s/g, ''))
  url.searchParams.set('fromAddressCountryCode', 'SE')
  url.searchParams.set('toAddressPostalCode', toPostalCode.replace(/\s/g, ''))
  url.searchParams.set('toAddressCountryCode', 'SE')
  // 19 är MyPack Collect, paket till ombud
  url.searchParams.set('serviceCode', '19')

  const data = await fetchPostNord(url, apiKey)
  const parsed = PostNordTransitTimeResponseSchema.safeParse(data)
  if (!parsed.success) {
    throw new Error(`PostNord svarade i ett oväntat format:\n${z.prettifyError(parsed.error)}`)
  }
  return { date: parsed.data.transitTimeResponse.transitTimes[0].deliveryDate.slice(0, 10) }
}

export const postnord: ShippingCarrier = {
  name: 'PostNord',
  findServicePoints,
  estimateDelivery,
}
