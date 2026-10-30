import { afterEach, beforeEach, describe, mock, test } from 'node:test'
import assert from 'node:assert/strict'
import { estimateDelivery, findServicePoints } from './postnordAdapter.js'
import type { DeliveryRequest } from './shippingCarrier.js'

// Påhittad nyckel. Testerna anropar aldrig PostNord, all trafik går till en låtsad fetch.
const FAKE_KEY = 'testnyckel0123456789abcdefABCDEF'

// Svaren nedan är förenklade kopior av riktiga svar från PostNords sandlåda
const icaRow = {
  name: 'Ica Supermarket Lindsdal',
  servicePointId: '331366',
  routeDistance: 530,
  visitingAddress: { countryCode: 'SE', city: 'KALMAR', streetName: 'Kanngjutarvägen', streetNumber: '5', postalCode: '39365' },
  coordinates: [{ countryCode: 'SE', northing: 56.735562, easting: 16.2951486, srId: 'EPSG:4326' }],
  openingHours: {
    postalServices: [{ openDay: 'Monday', openTime: '07:00', closeDay: 'Monday', closeTime: '22:00' }],
    specialDates: [],
  },
  type: { groupTypeId: 1, groupTypeName: 'Service agent', typeId: 25, typeName: 'Postombud', boxType: null },
}

const boxRow = {
  name: 'Paketbox Miljöhus Lassevägen',
  servicePointId: '2696390',
  routeDistance: 927,
  visitingAddress: { countryCode: 'SE', city: 'KALMAR', streetName: 'Lassevägen Miljöhus', streetNumber: '', postalCode: '39364' },
  coordinates: [{ srId: 'EPSG:4326', northing: 56.73227, easting: 16.29689, countryCode: 'SE' }],
  openingHours: { postalServices: [{ openDay: 'Monday', openTime: '00:00', closeDay: 'Monday', closeTime: '23:59' }] },
  type: {
    groupTypeId: 2,
    typeId: 2,
    boxType: { id: 3, label: 'MyBox', pickupRequirements: [{ id: 1, label: 'PostNord App' }, { id: 2, label: 'BankID' }] },
  },
}

function servicePointsBody(rows: unknown[]) {
  return { servicePointInformationResponse: { customerSupports: [], servicePoints: rows } }
}

const postalCodeNotFound = {
  servicePointInformationResponse: { compositeFault: { faults: [{ faultCode: 'API-400', explanationText: 'Postalcode not found' }] } },
}

function transitRow(serviceCode: string, timeOfArrival: string, additionalServices?: unknown[]) {
  return {
    eveningPickUp: false,
    latestTimeOfBooking: '2026-11-02T14:00:00',
    possibleDeviation: false,
    serviceInformation: { distribution: false, name: 'PostNord', pickup: true, serviceCode, ...(additionalServices && { additionalServices }) },
    timeOfArrival,
    timeOfDeparture: '2026-11-02T17:30:00',
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

// Ett svar där anslutningen bryts medan innehållet läses
function brokenBody() {
  const stream = new ReadableStream({
    pull(controller) {
      controller.error(new DOMException('The operation was aborted', 'AbortError'))
    },
  })
  return new Response(stream, { status: 200, headers: { 'content-type': 'application/json' } })
}

const timeout = () => {
  throw new DOMException('The operation was aborted due to timeout', 'TimeoutError')
}

let requests: URL[] = []
let logs: string[] = []

// Den låtsade fetch får adressen och avgör svaret, som PostNord skulle ha gjort
function useFetch(handler: (url: URL) => Response | Promise<Response>) {
  mock.method(globalThis, 'fetch', async (input: string | URL) => {
    const url = new URL(String(input))
    requests.push(url)
    return handler(url)
  })
}

const isParcelBoxSearch = (url: URL) => url.searchParams.get('typeId') === '2'

const homeRequest: DeliveryRequest = {
  fromPostalCode: '39365',
  toPostalCode: '111 51',
  handoverTime: '2026-11-02T14:00:00',
  delivery: 'home',
}

beforeEach(() => {
  process.env.POSTNORD_API_URL = 'https://postnord.test'
  process.env.POSTNORD_API_KEY = FAKE_KEY
  requests = []
  logs = []
  const record = (...args: unknown[]) => {
    logs.push(args.map(String).join(' '))
  }
  mock.method(console, 'warn', record)
  mock.method(console, 'error', record)
  mock.method(console, 'log', record)
})

afterEach(() => {
  mock.restoreAll()
})

describe('findServicePoints', () => {
  test('ombud och paketboxar hittas och görs om till butikens format', async () => {
    useFetch((url) => json(servicePointsBody(isParcelBoxSearch(url) ? [boxRow] : [icaRow])))
    const result = await findServicePoints('393 65')
    assert.equal(result.status, 'found')
    if (result.status !== 'found') return
    assert.deepEqual(result.unavailableKinds, [])
    assert.deepEqual(
      result.servicePoints.map((point) => [point.kind, point.id, point.city, point.street]),
      [
        ['servicePoint', '331366', 'Kalmar', 'Kanngjutarvägen 5'],
        ['parcelBox', '2696390', 'Kalmar', 'Lassevägen Miljöhus'],
      ],
    )
    assert.deepEqual(result.servicePoints[0].coordinates, { latitude: 56.735562, longitude: 16.2951486 })
    assert.deepEqual(result.servicePoints[0].openingHours, [{ day: 1, opens: '07:00', closes: '22:00' }])
    assert.deepEqual(result.servicePoints[1].pickupRequirements, ['PostNord App', 'BankID'])
    // Postnumret skickas utan mellanslag, och ombud och paketboxar hämtas var för sig
    assert.deepEqual(requests.map((url) => url.searchParams.get('postalCode')), ['39365', '39365'])
    assert.deepEqual(requests.map((url) => url.searchParams.get('typeId')).sort(), ['2', '24,25,54'])
  })

  test('extra fält i svaret ger inget fel', async () => {
    const withExtras = { ...icaRow, newField: { anything: true }, visitingAddress: { ...icaRow.visitingAddress, floor: 2 } }
    const body = servicePointsBody([withExtras])
    useFetch(() => json({ ...body, version: 5, servicePointInformationResponse: { ...body.servicePointInformationResponse, paging: {} } }))
    const result = await findServicePoints('39365')
    assert.equal(result.status, 'found')
  })

  test('ombuden används när paketboxarna svarar 503', async () => {
    useFetch((url) => (isParcelBoxSearch(url) ? json({ message: 'Service Unavailable' }, 503) : json(servicePointsBody([icaRow]))))
    const result = await findServicePoints('39365')
    assert.equal(result.status, 'found')
    if (result.status !== 'found') return
    assert.deepEqual(result.servicePoints.map((point) => point.id), ['331366'])
    assert.deepEqual(result.unavailableKinds, ['parcelBox'])
    assert.ok(logs.some((line) => line.includes('Paketboxsökning') && line.includes('503')))
  })

  test('paketboxarna används när ombudssökningen får timeout', async () => {
    useFetch((url) => (isParcelBoxSearch(url) ? json(servicePointsBody([boxRow])) : timeout()))
    const result = await findServicePoints('39365')
    assert.equal(result.status, 'found')
    if (result.status !== 'found') return
    assert.deepEqual(result.unavailableKinds, ['servicePoint'])
  })

  test('PostNords besked om att postnumret inte finns ger invalidPostalCode', async () => {
    useFetch(() => json(postalCodeNotFound, 400))
    const result = await findServicePoints('00000')
    assert.equal(result.status, 'invalidPostalCode')
  })

  test('texten jämförs utan hänsyn till stora bokstäver och mellanslag runt om', async () => {
    const shouted = { servicePointInformationResponse: { compositeFault: { faults: [{ faultCode: 'API-400', explanationText: '  POSTALCODE NOT FOUND ' }] } } }
    useFetch(() => json(shouted, 400))
    const result = await findServicePoints('00000')
    assert.equal(result.status, 'invalidPostalCode')
  })

  test('ett annat 400-fel ger rejected, inte invalidPostalCode', async () => {
    const invalidType = { servicePointInformationResponse: { compositeFault: { faults: [{ faultCode: 'invalidTypeId', explanationText: 'Invalid typeId: 4 for countryCode: SE' }] } } }
    useFetch(() => json(invalidType, 400))
    const result = await findServicePoints('39365')
    assert.equal(result.status, 'rejected')
  })

  test('fel nyckel (403) ger rejected', async () => {
    useFetch(() => json({ error: { status_code: 403, message: 'Missing API Key' } }, 403))
    const result = await findServicePoints('39365')
    assert.equal(result.status, 'rejected')
  })

  test('502 i båda anropen ger unavailable', async () => {
    useFetch(() => new Response('<html>502 Bad Gateway</html>', { status: 502 }))
    const result = await findServicePoints('39365')
    assert.equal(result.status, 'unavailable')
  })

  test('två tomma listor ger noServicePoints, aldrig invalidPostalCode', async () => {
    useFetch(() => json(servicePointsBody([])))
    const result = await findServicePoints('39365')
    assert.equal(result.status, 'noServicePoints')
  })

  test('ett svar i fel form ger invalidResponse', async () => {
    useFetch(() => json({ something: 'else' }))
    const result = await findServicePoints('39365')
    assert.equal(result.status, 'invalidResponse')
  })

  test('ett obligatoriskt fält med fel typ hoppas över och loggas', async () => {
    const broken = { ...icaRow, servicePointId: 331366 }
    useFetch((url) => json(servicePointsBody(isParcelBoxSearch(url) ? [] : [broken, { ...icaRow, servicePointId: '331369' }])))
    const result = await findServicePoints('39365')
    assert.equal(result.status, 'found')
    if (result.status !== 'found') return
    assert.deepEqual(result.servicePoints.map((point) => point.id), ['331369'])
    assert.ok(logs.some((line) => line.includes('hoppar över')))
  })

  test('svarar ingen plats i formatet blir det invalidResponse', async () => {
    useFetch(() => json(servicePointsBody([{ ...icaRow, name: null }])))
    const result = await findServicePoints('39365')
    assert.equal(result.status, 'invalidResponse')
  })

  test('utan platser avgör felet, och ombudens fel går först', async () => {
    useFetch((url) => (isParcelBoxSearch(url) ? json({}, 400) : timeout()))
    const result = await findServicePoints('39365')
    assert.equal(result.status, 'unavailable')
    assert.ok(result.reason.includes('Ombudssökning') && result.reason.includes('Paketboxsökning'))
  })

  test('avbruten anslutning medan svaret läses ger unavailable', async () => {
    useFetch(() => brokenBody())
    const result = await findServicePoints('39365')
    assert.equal(result.status, 'unavailable')
  })
})

describe('estimateDelivery', () => {
  test('hemleverans använder tjänst 17 och postnumret utan mellanslag', async () => {
    useFetch(() => json([transitRow('17', '2026-11-03T18:00:00')]))
    const result = await estimateDelivery(homeRequest)
    assert.deepEqual(result, { status: 'estimate', date: '2026-11-03' })
    const url = requests[0]
    assert.ok(url.pathname.endsWith('/rest/transport/v1/transittime/addresstoaddress'))
    assert.equal(url.searchParams.get('serviceCodes'), '17')
    assert.equal(url.searchParams.get('serviceGroup'), 'SE')
    assert.equal(url.searchParams.get('startTime'), '2026-11-02T14:00:00')
    assert.equal(url.searchParams.get('originPostCode'), '39365')
    assert.equal(url.searchParams.get('destinationPostCode'), '11151')
    assert.equal(url.searchParams.get('destinationLocationId'), null)
  })

  test('ombud utan valt ombud räknas till postnumret med tjänst 19', async () => {
    useFetch(() => json([transitRow('19', '2026-11-03T18:00:00')]))
    const result = await estimateDelivery({ ...homeRequest, delivery: 'servicePoint' })
    assert.equal(result.status, 'estimate')
    assert.ok(requests[0].pathname.endsWith('/addresstoaddress'))
    assert.equal(requests[0].searchParams.get('serviceCodes'), '19')
  })

  test('valt ombud räknas till just det ombudet', async () => {
    useFetch(() => json([transitRow('19', '2026-11-03T18:00:00')]))
    const result = await estimateDelivery({ ...homeRequest, delivery: 'servicePoint', servicePointId: '331366' })
    assert.deepEqual(result, { status: 'estimate', date: '2026-11-03' })
    const url = requests[0]
    assert.ok(url.pathname.endsWith('/rest/transport/v1/transittime/addresstolocation'))
    assert.equal(url.searchParams.get('destinationLocationId'), '331366')
    assert.equal(url.searchParams.get('destinationLocationType'), 'servicepoint')
    assert.equal(url.searchParams.get('destinationPostCode'), null)
  })

  test('vald paketbox räknas på samma sätt som ett ombud', async () => {
    useFetch(() => json([transitRow('19', '2026-11-04T18:00:00')]))
    const result = await estimateDelivery({ ...homeRequest, delivery: 'servicePoint', servicePointId: '2696390' })
    assert.deepEqual(result, { status: 'estimate', date: '2026-11-04' })
    assert.equal(requests[0].searchParams.get('destinationLocationId'), '2696390')
  })

  test('saknas ett tillägg men grundtjänsten finns blir det ändå en leveranstid', async () => {
    useFetch(() => json([transitRow('17', '2026-11-03T18:00:00'), { errorMessage: 'Service SE-17-F1 is not offered from postal code 39365' }]))
    const result = await estimateDelivery(homeRequest)
    assert.deepEqual(result, { status: 'estimate', date: '2026-11-03' })
  })

  test('bara varianter med tillägg ger notSupported', async () => {
    useFetch(() => json([transitRow('17', '2026-11-03T18:00:00', [{ code: 'C4', name: 'ID check' }])]))
    const result = await estimateDelivery(homeRequest)
    assert.equal(result.status, 'notSupported')
  })

  test('flera grundtjänstrader ger den tidigaste ankomsten', async () => {
    useFetch(() => json([transitRow('17', '2026-11-04T18:00:00'), transitRow('17', '2026-11-03T09:00:00'), transitRow('17', '2026-11-03T18:00:00')]))
    const result = await estimateDelivery(homeRequest)
    assert.deepEqual(result, { status: 'estimate', date: '2026-11-03' })
  })

  test('extra fält i raderna ger inget fel', async () => {
    useFetch(() => json([{ ...transitRow('17', '2026-11-03T18:00:00'), deliveryPoint: { name: 'X' }, somethingNew: [1, 2] }]))
    const result = await estimateDelivery(homeRequest)
    assert.equal(result.status, 'estimate')
  })

  test('ogiltigt ombuds-id ger invalidServicePoint', async () => {
    useFetch(() => json([{ errorMessage: "Requested destination location '999999999-SERVICE_POINT-SE' not found.", isBookable: false, isSupported: false }]))
    const result = await estimateDelivery({ ...homeRequest, delivery: 'servicePoint', servicePointId: '999999999' })
    assert.equal(result.status, 'invalidServicePoint')
  })

  test('ett annat fel från addresstolocation ger inte invalidServicePoint', async () => {
    useFetch(() => json([{ errorMessage: 'Service SE-19 is not offered from postal code 39365', isBookable: false, isSupported: true }]))
    const result = await estimateDelivery({ ...homeRequest, delivery: 'servicePoint', servicePointId: '331366' })
    assert.equal(result.status, 'notSupported')
  })

  test('200 med en felrad från addresstoaddress ger notSupported', async () => {
    useFetch(() => json([{ errorMessage: 'Service SE-17 is not offered from postal code 39365', isBookable: false, isSupported: true }]))
    const result = await estimateDelivery(homeRequest)
    assert.equal(result.status, 'notSupported')
  })

  test('PostNords besked om ogiltigt postnummer ger invalidPostalCode', async () => {
    useFetch(() =>
      json(
        {
          compositeFault: {
            faults: [{ explanationText: "Postal code '00000' does not exist for country code 'SE'", faultCode: 'API-009', paramValues: [{ param: 'destinationPostCode', value: '00000' }] }],
          },
          message: "Postal code '00000' does not exist for country code 'SE'",
        },
        400,
      ),
    )
    const result = await estimateDelivery({ ...homeRequest, toPostalCode: '00000' })
    assert.equal(result.status, 'invalidPostalCode')
  })

  test('ett annat 400-fel ger rejected', async () => {
    useFetch(() =>
      json({ compositeFault: { faults: [{ explanationText: "Required request parameter 'startTime' is not present", faultCode: 'API-008' }] } }, 400),
    )
    const result = await estimateDelivery(homeRequest)
    assert.equal(result.status, 'rejected')
  })

  test('502 och 429 ger unavailable', async () => {
    useFetch(() => new Response('<html>502 Bad Gateway</html>', { status: 502 }))
    assert.equal((await estimateDelivery(homeRequest)).status, 'unavailable')
    mock.restoreAll()
    useFetch(() => json({ message: 'Too Many Requests' }, 429))
    assert.equal((await estimateDelivery(homeRequest)).status, 'unavailable')
  })

  test('timeout ger unavailable', async () => {
    useFetch(() => timeout())
    const result = await estimateDelivery(homeRequest)
    assert.equal(result.status, 'unavailable')
    assert.ok(result.reason.includes('inget svar inom'))
  })

  test('avbruten anslutning medan svaret läses ger unavailable', async () => {
    useFetch(() => brokenBody())
    const result = await estimateDelivery(homeRequest)
    assert.equal(result.status, 'unavailable')
  })

  test('ett lyckat svar som inte är JSON ger invalidResponse', async () => {
    useFetch(() => new Response('<html>Hej</html>', { status: 200 }))
    const result = await estimateDelivery(homeRequest)
    assert.equal(result.status, 'invalidResponse')
  })

  test('JSON i fel form ger invalidResponse', async () => {
    useFetch(() => json({ transitTimes: [] }))
    const result = await estimateDelivery(homeRequest)
    assert.equal(result.status, 'invalidResponse')
  })

  test('ett obligatoriskt fält med fel typ ger invalidResponse', async () => {
    useFetch(() => json([{ ...transitRow('17', '2026-11-03T18:00:00'), serviceInformation: { serviceCode: 17 } }]))
    const result = await estimateDelivery(homeRequest)
    assert.equal(result.status, 'invalidResponse')
  })

  for (const badTime of ['2026-02-30T18:00:00', '2026-13-01T18:00:00', '2026-11-02T25:00:00', '2026-11-02T18:61:00', '2026-11-02Tkväll', '2026-11-02T18:00']) {
    test(`ogiltig tid "${badTime}" blir aldrig en leveranstid`, async () => {
      useFetch(() => json([transitRow('17', badTime)]))
      const result = await estimateDelivery(homeRequest)
      assert.equal(result.status, 'invalidResponse')
    })
  }

  test('saknade miljövariabler ger unavailable utan att något anrop görs', async () => {
    delete process.env.POSTNORD_API_URL
    useFetch(() => json([]))
    const result = await estimateDelivery(homeRequest)
    assert.equal(result.status, 'unavailable')
    assert.equal(requests.length, 0)
  })
})

describe('API-nyckeln', () => {
  test('finns aldrig i skäl eller loggar, inte ens när PostNord skickar tillbaka den', async () => {
    const echo = { compositeFault: { faults: [{ faultCode: 'API-008', explanationText: `Bad request for apikey=${FAKE_KEY}` }] } }
    const echoPoints = { servicePointInformationResponse: { compositeFault: { faults: [{ faultCode: 'API-400', explanationText: `Bad key ${FAKE_KEY}` }] } } }
    const reasons: string[] = []

    const cases: (() => Response)[] = [
      () => json(echo, 400),
      () => new Response(`<html>${FAKE_KEY}</html>`, { status: 502 }),
      () => json([{ unexpected: FAKE_KEY }]),
      () => timeout(),
    ]
    for (const respond of cases) {
      mock.restoreAll()
      mock.method(console, 'warn', (...args: unknown[]) => logs.push(args.map(String).join(' ')))
      useFetch(respond)
      const result = await estimateDelivery(homeRequest)
      if (result.status !== 'estimate') reasons.push(result.reason)
    }

    mock.restoreAll()
    mock.method(console, 'warn', (...args: unknown[]) => logs.push(args.map(String).join(' ')))
    useFetch((url) => (isParcelBoxSearch(url) ? json(echoPoints, 400) : json(servicePointsBody([{ ...icaRow, name: FAKE_KEY.length }]))))
    const points = await findServicePoints('39365')
    if (points.status !== 'found') reasons.push(points.reason)

    assert.ok(reasons.length >= 5)
    for (const text of [...reasons, ...logs]) {
      assert.ok(!text.includes(FAKE_KEY), `nyckeln finns i: ${text}`)
    }
    assert.ok(reasons.some((reason) => reason.includes('***')))
  })
})
