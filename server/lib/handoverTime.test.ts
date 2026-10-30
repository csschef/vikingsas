import { afterEach, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { nextHandoverTime } from './handoverTime.js'

const rules = { cutoffHour: 12, handoverHour: 14 }

// Ögonblicken anges i UTC. Svensk vintertid är UTC+1 och sommartid UTC+2.
function handover(instant: string) {
  return nextHandoverTime(new Date(instant), rules)
}

describe('nextHandoverTime', () => {
  test('vardag före bryttiden ger samma dag', () => {
    assert.equal(handover('2026-11-02T10:59:00Z'), '2026-11-02T14:00:00')
  })

  test('exakt på bryttiden räknas som efter', () => {
    assert.equal(handover('2026-11-02T11:00:00Z'), '2026-11-03T14:00:00')
  })

  test('vardag efter bryttiden ger nästa vardag', () => {
    assert.equal(handover('2026-11-02T11:01:00Z'), '2026-11-03T14:00:00')
  })

  test('fredag efter bryttiden ger måndag', () => {
    assert.equal(handover('2026-10-30T11:30:00Z'), '2026-11-02T14:00:00')
  })

  test('lördag ger måndag', () => {
    assert.equal(handover('2026-10-31T09:00:00Z'), '2026-11-02T14:00:00')
  })

  test('söndag sent på kvällen ger måndag', () => {
    assert.equal(handover('2026-11-01T22:30:00Z'), '2026-11-02T14:00:00')
  })

  test('sommartid: 11.59 svensk tid är före bryttiden', () => {
    assert.equal(handover('2026-10-23T09:59:00Z'), '2026-10-23T14:00:00')
  })

  test('sommartid: 12.00 svensk tid är 10.00 UTC och räknas som efter', () => {
    assert.equal(handover('2026-10-23T10:00:00Z'), '2026-10-26T14:00:00')
  })

  test('helgen då vintertid börjar, direkt efter bytet', () => {
    assert.equal(handover('2026-10-25T01:30:00Z'), '2026-10-26T14:00:00')
  })

  test('fredag före helgen då sommartid börjar', () => {
    assert.equal(handover('2026-03-27T11:00:00Z'), '2026-03-30T14:00:00')
  })

  test('första vardagen med sommartid, före och exakt på bryttiden', () => {
    assert.equal(handover('2026-03-30T09:59:00Z'), '2026-03-30T14:00:00')
    assert.equal(handover('2026-03-30T10:00:00Z'), '2026-03-31T14:00:00')
  })

  test('årsskifte, där nyårsdagen räknas som vardag eftersom helgdagar inte hanteras än', () => {
    assert.equal(handover('2026-12-31T12:00:00Z'), '2027-01-01T14:00:00')
  })
})

describe('nextHandoverTime med miljövariabler', () => {
  afterEach(() => {
    delete process.env.SHIPPING_CUTOFF_HOUR
    delete process.env.SHIPPING_HANDOVER_HOUR
  })

  test('läser bryttid och överlämning från miljön', () => {
    process.env.SHIPPING_CUTOFF_HOUR = '10'
    process.env.SHIPPING_HANDOVER_HOUR = '16'
    // 10.30 svensk vintertid
    assert.equal(nextHandoverTime(new Date('2026-11-02T09:30:00Z')), '2026-11-03T16:00:00')
  })

  test('ogiltiga värden ger standardvärdena 12 och 14', () => {
    process.env.SHIPPING_CUTOFF_HOUR = 'tolv'
    process.env.SHIPPING_HANDOVER_HOUR = '25'
    assert.equal(nextHandoverTime(new Date('2026-11-02T10:30:00Z')), '2026-11-02T14:00:00')
  })
})
