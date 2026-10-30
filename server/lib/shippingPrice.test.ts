import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { calculateShipping, ShippingMethodUpdate, type ShippingMethodRow } from './shippingPrice.js'

// Samma värden som i db/seed.sql
const ombud: ShippingMethodRow = { code: 'ombud', name: 'Ombud eller paketbox', price: '69.00', free_from: '399.00' }
const hem: ShippingMethodRow = { code: 'hem', name: 'Hemleverans', price: '139.00', free_from: '499.00' }

describe('calculateShipping', () => {
  test('under gränsen betalar kunden fullt pris och ser vad som fattas', () => {
    assert.deepEqual(calculateShipping(ombud, 309), {
      code: 'ombud',
      name: 'Ombud eller paketbox',
      price: 69,
      regularPrice: 69,
      freeFrom: 399,
      amountToFreeShipping: 90,
    })
  })

  test('exakt på gränsen är frakten fri', () => {
    const option = calculateShipping(ombud, 399)
    assert.equal(option.price, 0)
    assert.equal(option.amountToFreeShipping, null)
  })

  test('en krona under gränsen kostar fortfarande', () => {
    const option = calculateShipping(ombud, 398)
    assert.equal(option.price, 69)
    assert.equal(option.amountToFreeShipping, 1)
  })

  test('över gränsen är frakten fri', () => {
    assert.equal(calculateShipping(ombud, 450).price, 0)
  })

  test('hemleverans har sin egen gräns', () => {
    assert.equal(calculateShipping(hem, 450).price, 139)
    assert.equal(calculateShipping(hem, 450).amountToFreeShipping, 49)
    assert.equal(calculateShipping(hem, 499).price, 0)
  })

  test('utan gräns blir frakten aldrig fri', () => {
    const option = calculateShipping({ ...hem, free_from: null }, 10_000)
    assert.equal(option.price, 139)
    assert.equal(option.freeFrom, null)
    assert.equal(option.amountToFreeShipping, null)
  })

  test('decimaler räknas exakt, 398,90 plus 0,10 når gränsen', () => {
    assert.equal(calculateShipping(ombud, 398.9 + 0.1).price, 0)
    assert.equal(calculateShipping(ombud, 398.99).amountToFreeShipping, 0.01)
  })

  test('tom varukorg betalar fullt pris', () => {
    assert.equal(calculateShipping(ombud, 0).price, 69)
  })
})

describe('ShippingMethodUpdate', () => {
  const valid = { name: 'Hemleverans', price: 139, free_from: 499 }
  const fieldsWithError = (input: unknown) => {
    const result = ShippingMethodUpdate.safeParse(input)
    return result.success ? [] : result.error.issues.map((issue) => String(issue.path[0]))
  }

  test('giltiga värden godkänns, och namnet trimmas', () => {
    const result = ShippingMethodUpdate.safeParse({ ...valid, name: '  Hemleverans  ' })
    assert.equal(result.success, true)
    if (result.success) assert.equal(result.data.name, 'Hemleverans')
  })

  test('tom gräns betyder ingen fri frakt och godkänns', () => {
    assert.deepEqual(fieldsWithError({ ...valid, free_from: null }), [])
  })

  test('gratis frakt utan gräns är tillåtet, pris 0', () => {
    assert.deepEqual(fieldsWithError({ ...valid, price: 0, free_from: null }), [])
  })

  test('negativt pris och fler än två decimaler nekas', () => {
    assert.deepEqual(fieldsWithError({ ...valid, price: -1 }), ['price'])
    assert.deepEqual(fieldsWithError({ ...valid, price: 69.999 }), ['price'])
  })

  test('decimaler som 49,90 godkänns', () => {
    assert.deepEqual(fieldsWithError({ ...valid, price: 49.9, free_from: 399.5 }), [])
  })

  test('gränsen måste vara större än 0', () => {
    assert.deepEqual(fieldsWithError({ ...valid, free_from: 0 }), ['free_from'])
  })

  test('tomt namn, text som pris och saknad gräns nekas', () => {
    assert.deepEqual(fieldsWithError({ ...valid, name: '   ' }), ['name'])
    assert.deepEqual(fieldsWithError({ ...valid, price: '139' }), ['price'])
    assert.deepEqual(fieldsWithError({ name: 'Hemleverans', price: 139 }), ['free_from'])
  })

  test('koden kan inte ändras, extra fält ignoreras', () => {
    const result = ShippingMethodUpdate.safeParse({ ...valid, code: 'paketbox' })
    assert.equal(result.success, true)
    if (result.success) assert.equal('code' in result.data, false)
  })
})
