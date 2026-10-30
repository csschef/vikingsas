import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { buildPaymentLines, itemsTotal } from './orderTotals.js'
import { calculateShipping } from './shippingPrice.js'

const cart = [
  { title: 'Habanero', price: '119.00', quantity: 2 },
  { title: 'Chiliflakes Mild', price: '49.00', quantity: 1 },
]
const ombud = { code: 'ombud' as const, name: 'Ombud eller paketbox', price: '69.00', free_from: '399.00' }

// Det ordern sparar och det Stripe får ska alltid vara samma summa
function sumOfLines(lines: { unitAmountOre: number; quantity: number }[]) {
  return lines.reduce((sum, line) => sum + line.unitAmountOre * line.quantity, 0)
}

describe('itemsTotal', () => {
  test('räknar varornas summa i kronor', () => {
    assert.equal(itemsTotal(cart), 287)
  })

  test('decimaler blir exakta', () => {
    assert.equal(itemsTotal([{ title: 'A', price: '0.10', quantity: 3 }, { title: 'B', price: '0.20', quantity: 1 }]), 0.5)
  })
})

describe('buildPaymentLines', () => {
  test('under gränsen: fraktraden finns och summan är varor plus frakt', () => {
    const shipping = calculateShipping(ombud, itemsTotal(cart))
    const { lines, totalOre } = buildPaymentLines(cart, { name: ombud.name, price: shipping.price })
    assert.deepEqual(lines.at(-1), { name: 'Frakt: Ombud eller paketbox', unitAmountOre: 6900, quantity: 1 })
    assert.equal(totalOre, 28700 + 6900)
    assert.equal(totalOre, sumOfLines(lines))
  })

  test('fri frakt: ingen fraktrad och summan är bara varorna', () => {
    const bigCart = [...cart, { title: 'Presentask Mild', price: '299.00', quantity: 1 }]
    const shipping = calculateShipping(ombud, itemsTotal(bigCart))
    assert.equal(shipping.price, 0)
    const { lines, totalOre } = buildPaymentLines(bigCart, { name: ombud.name, price: shipping.price })
    assert.equal(lines.length, bigCart.length)
    assert.equal(totalOre, 58600)
    assert.equal(totalOre, sumOfLines(lines))
  })

  test('varje vara har sitt pris i ören och sitt antal', () => {
    const { lines } = buildPaymentLines(cart, { name: ombud.name, price: 69 })
    assert.deepEqual(lines.slice(0, 2), [
      { name: 'Habanero', unitAmountOre: 11900, quantity: 2 },
      { name: 'Chiliflakes Mild', unitAmountOre: 4900, quantity: 1 },
    ])
  })
})
