import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { assignServicePoint, assignmentBlocker, checkHomeDelivery, chooseServicePoint } from './shippingChoice.js'
import type { ServicePoint, ServicePointsResult } from '../integrations/shippingCarrier.js'

const ica: ServicePoint = {
  id: '331366',
  kind: 'servicePoint',
  name: 'Ica Supermarket Lindsdal',
  street: 'Kanngjutarvägen 5',
  postalCode: '39365',
  city: 'Kalmar',
  countryCode: 'SE',
  distanceMeters: 530,
  coordinates: null,
  openingHours: [],
  pickupRequirements: [],
}

const found: ServicePointsResult = { status: 'found', servicePoints: [ica], unavailableKinds: [] }
const partial: ServicePointsResult = { status: 'found', servicePoints: [ica], unavailableKinds: ['parcelBox'] }

describe('chooseServicePoint', () => {
  test('valt ombud som finns i listan blir Vald med hela ögonblicksbilden', () => {
    const choice = chooseServicePoint('331366', found)
    assert.deepEqual(choice, {
      ok: true,
      log: null,
      servicePoint: {
        service_point_status: 'Vald',
        service_point_id: '331366',
        service_point_country_code: 'SE',
        service_point_name: 'Ica Supermarket Lindsdal',
        service_point_street: 'Kanngjutarvägen 5',
        service_point_postal_code: '39365',
        service_point_city: 'Kalmar',
      },
    })
  })

  test('valt ombud som saknas när alla grupper svarade avvisas', () => {
    const choice = chooseServicePoint('999', found)
    assert.equal(choice.ok, false)
    if (choice.ok) return
    assert.equal(choice.field, 'service_point_id')
  })

  test('valt ombud som saknas när en grupp inte svarade blir Väntar', () => {
    const choice = chooseServicePoint('999', partial)
    assert.equal(choice.ok, true)
    if (!choice.ok) return
    assert.equal(choice.servicePoint.service_point_status, 'Väntar')
    assert.equal(choice.servicePoint.service_point_id, null)
    assert.equal(choice.log?.level, 'warn')
  })

  test('ombud utan val när PostNord har svarat avvisas', () => {
    for (const result of [found, partial]) {
      const choice = chooseServicePoint(undefined, result)
      assert.equal(choice.ok, false)
      if (choice.ok) continue
      assert.equal(choice.field, 'service_point_id')
    }
  })

  test('bekräftat inga ombud avvisar ombud, med eller utan valt ombud', () => {
    const none: ServicePointsResult = { status: 'noServicePoints', reason: 'inga' }
    for (const id of ['331366', undefined]) {
      const choice = chooseServicePoint(id, none)
      assert.equal(choice.ok, false)
      if (choice.ok) continue
      assert.equal(choice.field, 'shipping_method')
      assert.ok(choice.error.includes('hemleverans'))
    }
  })

  test('tekniska fel och avvisade anrop ger Väntar, med eller utan valt ombud', () => {
    for (const status of ['unavailable', 'rejected', 'invalidResponse'] as const) {
      for (const id of ['331366', undefined]) {
        const choice = chooseServicePoint(id, { status, reason: 'fel' })
        assert.equal(choice.ok, true)
        if (!choice.ok) continue
        assert.equal(choice.servicePoint.service_point_status, 'Väntar')
        assert.equal(choice.servicePoint.service_point_id, null)
      }
    }
  })

  test('integrationsfel loggas som fel, PostNord som inte svarar som varning', () => {
    assert.equal(chooseServicePoint('331366', { status: 'rejected', reason: 'fel' }).log?.level, 'error')
    assert.equal(chooseServicePoint('331366', { status: 'unavailable', reason: 'fel' }).log?.level, 'warn')
  })

  test('ogiltigt postnummer avvisas på postnummerfältet', () => {
    const choice = chooseServicePoint('331366', { status: 'invalidPostalCode', reason: 'finns inte' })
    assert.equal(choice.ok, false)
    if (choice.ok) return
    assert.equal(choice.field, 'shipping_postal_code')
  })
})

describe('assignmentBlocker', () => {
  const waitingPaid = { shipping_method: 'ombud', service_point_status: 'Väntar', payment_status: 'Betald', status: 'Beställd' }

  test('en betald order med ombud som väntar får tilldelas', () => {
    assert.equal(assignmentBlocker(waitingPaid), null)
    assert.equal(assignmentBlocker({ ...waitingPaid, status: 'Behandlas' }), null)
  })

  test('obetalda och avbrutna ordrar nekas', () => {
    assert.ok(assignmentBlocker({ ...waitingPaid, payment_status: 'Obetald' }))
    assert.ok(assignmentBlocker({ ...waitingPaid, payment_status: 'Avbruten' }))
  })

  test('återbetalda ordrar nekas', () => {
    assert.ok(assignmentBlocker({ ...waitingPaid, status: 'Återbetald' }))
  })

  test('ordrar som redan har ombud nekas', () => {
    assert.ok(assignmentBlocker({ ...waitingPaid, service_point_status: 'Vald' }))
  })

  test('hemleverans och gamla ordrar utan frakt nekas', () => {
    assert.ok(assignmentBlocker({ ...waitingPaid, shipping_method: 'hem', service_point_status: null }))
    assert.ok(assignmentBlocker({ ...waitingPaid, shipping_method: null, service_point_status: null }))
  })
})

describe('assignServicePoint', () => {
  test('ett ombud som finns för postnumret blir Vald', () => {
    const assignment = assignServicePoint('331366', found)
    assert.equal(assignment.ok, true)
    if (!assignment.ok) return
    assert.equal(assignment.servicePoint.service_point_status, 'Vald')
    assert.equal(assignment.servicePoint.service_point_country_code, 'SE')
  })

  test('ett ombud som inte finns för postnumret avvisas med 400', () => {
    const assignment = assignServicePoint('999', found)
    assert.equal(assignment.ok, false)
    if (assignment.ok) return
    assert.equal(assignment.httpStatus, 400)
  })

  test('ett ombud i en grupp som inte svarade kan inte kontrolleras och sparas inte', () => {
    const assignment = assignServicePoint('999', partial)
    assert.equal(assignment.ok, false)
    if (assignment.ok) return
    assert.equal(assignment.httpStatus, 502)
  })

  test('PostNord som inte svarar eller svarar fel ger 502, och ingenting sparas', () => {
    for (const status of ['unavailable', 'rejected', 'invalidResponse'] as const) {
      const assignment = assignServicePoint('331366', { status, reason: 'fel' })
      assert.equal(assignment.ok, false)
      if (assignment.ok) continue
      assert.equal(assignment.httpStatus, 502)
    }
  })

  test('ogiltigt postnummer och inga ombud ger 400', () => {
    for (const result of [
      { status: 'invalidPostalCode', reason: 'finns inte' },
      { status: 'noServicePoints', reason: 'inga' },
    ] as const) {
      const assignment = assignServicePoint('331366', result)
      assert.equal(assignment.ok, false)
      if (assignment.ok) continue
      assert.equal(assignment.httpStatus, 400)
    }
  })
})

describe('checkHomeDelivery', () => {
  test('leveranstid eller tekniskt fel: köpet går igenom utan ombud', () => {
    for (const result of [
      { status: 'estimate', date: '2026-11-02' },
      { status: 'unavailable', reason: 'fel' },
      { status: 'rejected', reason: 'fel' },
      { status: 'invalidResponse', reason: 'fel' },
    ] as const) {
      const choice = checkHomeDelivery(result)
      assert.equal(choice.ok, true)
      if (!choice.ok) continue
      assert.equal(choice.servicePoint.service_point_status, null)
      assert.equal(choice.servicePoint.service_point_id, null)
    }
  })

  test('ogiltigt postnummer avvisas', () => {
    const choice = checkHomeDelivery({ status: 'invalidPostalCode', reason: 'finns inte' })
    assert.equal(choice.ok, false)
    if (choice.ok) return
    assert.equal(choice.field, 'shipping_postal_code')
  })

  test('hemleverans som inte erbjuds avvisas', () => {
    const choice = checkHomeDelivery({ status: 'notSupported', reason: 'inte här' })
    assert.equal(choice.ok, false)
    if (choice.ok) return
    assert.equal(choice.field, 'shipping_method')
  })
})
