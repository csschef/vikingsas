import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { buildShippingQuote } from './shippingQuote.js'
import type { DeliveryEstimateResult, ServicePoint, ServicePointsResult } from '../integrations/shippingCarrier.js'
import type { ShippingOption } from './shippingPrice.js'

const options: ShippingOption[] = [
  { code: 'ombud', name: 'Ombud eller paketbox', price: 69, regularPrice: 69, freeFrom: 399, amountToFreeShipping: 90 },
  { code: 'hem', name: 'Hemleverans', price: 139, regularPrice: 139, freeFrom: 499, amountToFreeShipping: 190 },
]

const ica: ServicePoint = {
  id: '331366',
  kind: 'servicePoint',
  name: 'Ica Supermarket Lindsdal',
  street: 'Kanngjutarvägen 5',
  postalCode: '39365',
  city: 'Kalmar',
  countryCode: 'SE',
  distanceMeters: 530,
  coordinates: { latitude: 56.735562, longitude: 16.2951486 },
  openingHours: [{ day: 1, opens: '07:00', closes: '22:00' }],
  pickupRequirements: [],
}

const found: ServicePointsResult = { status: 'found', servicePoints: [ica], unavailableKinds: [] }
const estimate: DeliveryEstimateResult = { status: 'estimate', date: '2026-11-02' }
const SECRET_REASON = 'PostNords egen text som aldrig ska till kunden'

function quote(input: { servicePoints?: ServicePointsResult; homeEstimate?: DeliveryEstimateResult; servicePointEstimate?: DeliveryEstimateResult }) {
  return buildShippingQuote({
    options,
    servicePoints: input.servicePoints ?? found,
    homeEstimate: input.homeEstimate ?? estimate,
    servicePointEstimate: input.servicePointEstimate ?? estimate,
  })
}

describe('buildShippingQuote', () => {
  test('allt fungerar: båda alternativen med leveranstid och ombuden', () => {
    const result = quote({})
    assert.equal(result.status, 'ok')
    assert.equal(result.quote.servicePointStatus, 'found')
    assert.deepEqual(result.quote.options.map((option) => [option.code, option.estimatedDelivery]), [
      ['ombud', '2026-11-02'],
      ['hem', '2026-11-02'],
    ])
    assert.deepEqual(result.quote.servicePoints, [ica])
    assert.deepEqual(result.logs, [])
  })

  test('partiellt resultat skickas vidare med de grupper som saknas', () => {
    const result = quote({ servicePoints: { status: 'found', servicePoints: [ica], unavailableKinds: ['parcelBox'] } })
    assert.equal(result.status, 'ok')
    assert.deepEqual(result.quote.unavailableKinds, ['parcelBox'])
    assert.equal(result.quote.servicePointStatus, 'found')
  })

  test('inga ombud: hemleverans erbjuds och ombud tas bort', () => {
    const result = quote({ servicePoints: { status: 'noServicePoints', reason: SECRET_REASON } })
    assert.equal(result.status, 'ok')
    assert.equal(result.quote.servicePointStatus, 'none')
    assert.deepEqual(result.quote.options.map((option) => option.code), ['hem'])
  })

  test('bekräftat inga ombud och ingen hemleverans: inget fraktsätt erbjuds', () => {
    const result = quote({
      servicePoints: { status: 'noServicePoints', reason: SECRET_REASON },
      homeEstimate: { status: 'notSupported', reason: SECRET_REASON },
    })
    assert.equal(result.status, 'ok')
    assert.equal(result.quote.servicePointStatus, 'none')
    assert.deepEqual(result.quote.options, [])
  })

  test('PostNord svarar inte: manual, och det loggas som varning', () => {
    const result = quote({ servicePoints: { status: 'unavailable', reason: SECRET_REASON } })
    assert.equal(result.status, 'ok')
    assert.equal(result.quote.servicePointStatus, 'manual')
    assert.deepEqual(result.quote.servicePoints, [])
    assert.equal(result.logs[0].level, 'warn')
    assert.ok(result.logs[0].message.startsWith('PostNord svarar inte'))
  })

  for (const status of ['rejected', 'invalidResponse'] as const) {
    test(`${status}: unverified, och det loggas som integrationsfel`, () => {
      const result = quote({ servicePoints: { status, reason: SECRET_REASON } })
      assert.equal(result.status, 'ok')
      assert.equal(result.quote.servicePointStatus, 'unverified')
      assert.deepEqual(result.quote.options.map((option) => option.code), ['ombud', 'hem'])
      assert.equal(result.logs[0].level, 'error')
      assert.ok(result.logs[0].message.startsWith('Integrationsfel mot PostNord'))
    })
  }

  test('ogiltigt postnummer från ombudssökningen', () => {
    const result = quote({ servicePoints: { status: 'invalidPostalCode', reason: SECRET_REASON } })
    assert.equal(result.status, 'invalidPostalCode')
  })

  test('ogiltigt postnummer från leveranstiden', () => {
    const result = quote({ homeEstimate: { status: 'invalidPostalCode', reason: SECRET_REASON } })
    assert.equal(result.status, 'invalidPostalCode')
  })

  test('ett fel i leveranstiden tar aldrig bort hemleverans', () => {
    for (const status of ['unavailable', 'rejected', 'invalidResponse'] as const) {
      const result = quote({ homeEstimate: { status, reason: SECRET_REASON } })
      assert.equal(result.status, 'ok')
      const home = result.quote.options.find((option) => option.code === 'hem')
      assert.ok(home)
      assert.equal(home.estimatedDelivery, null)
    }
  })

  test('hemleverans som inte erbjuds tas bort', () => {
    const result = quote({ homeEstimate: { status: 'notSupported', reason: SECRET_REASON } })
    assert.equal(result.status, 'ok')
    assert.deepEqual(result.quote.options.map((option) => option.code), ['ombud'])
  })

  test('saknad leveranstid för ombud påverkar inte ombudsvalet', () => {
    const result = quote({ servicePointEstimate: { status: 'unavailable', reason: SECRET_REASON } })
    assert.equal(result.status, 'ok')
    assert.equal(result.quote.servicePointStatus, 'found')
    assert.equal(result.quote.options[0].estimatedDelivery, null)
  })

  test('svaret till kassan innehåller aldrig PostNords skäl', () => {
    const cases = [
      quote({ servicePoints: { status: 'unavailable', reason: SECRET_REASON } }),
      quote({ servicePoints: { status: 'rejected', reason: SECRET_REASON } }),
      quote({ servicePoints: { status: 'noServicePoints', reason: SECRET_REASON }, homeEstimate: { status: 'notSupported', reason: SECRET_REASON } }),
      quote({ servicePointEstimate: { status: 'invalidResponse', reason: SECRET_REASON } }),
    ]
    for (const result of cases) {
      assert.equal(result.status, 'ok')
      assert.ok(!JSON.stringify(result.quote).includes(SECRET_REASON))
      assert.ok(result.logs.some((entry) => entry.message.includes(SECRET_REASON)))
    }
  })
})
