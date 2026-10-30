import { z } from 'zod'
import { fetchJson } from '../lib/fetchJson.js'
import type { ServicePoint, ShippingCarrier } from './shippingCarrier.js'

const NUMBER_OF_SERVICE_POINTS = 5

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
})

// Nycklarna läses först när de behövs, så att resten av servern startar även om de saknas
function getConfig() {
  const baseUrl = process.env.POSTNORD_API_URL
  const apiKey = process.env.POSTNORD_API_KEY
  if (!baseUrl || !apiKey) {
    throw new Error('POSTNORD_API_URL eller POSTNORD_API_KEY saknas i miljövariablerna')
  }
  return { baseUrl, apiKey }
}

// Nyckeln skickas i adressen, så den tas bort ur felmeddelandet innan det kan hamna i en logg
async function fetchPostNord(url: URL, apiKey: string) {
  try {
    return await fetchJson(url.toString())
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`PostNord svarade inte: ${message.replaceAll(apiKey, '***')}`)
  }
}

export const findServicePoints: ShippingCarrier['findServicePoints'] = async (postalCode) => {
  const { baseUrl, apiKey } = getConfig()

  const url = new URL(`${baseUrl}/rest/businesslocation/v5/servicepoints/nearest/byaddress`)
  url.searchParams.set('apikey', apiKey)
  url.searchParams.set('returnType', 'json')
  url.searchParams.set('countryCode', 'SE')
  url.searchParams.set('postalCode', postalCode)
  url.searchParams.set('numberOfServicePoints', String(NUMBER_OF_SERVICE_POINTS))

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
    servicePoints.push({
      id: point.data.servicePointId,
      name: point.data.name,
      street: [address.streetName, address.streetNumber].filter(Boolean).join(' '),
      postalCode: address.postalCode,
      city: address.city,
      distanceMeters: point.data.routeDistance ?? null,
    })
  }
  return servicePoints
}
