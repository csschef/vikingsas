import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { escapeHtml, orderConfirmation, type ConfirmationOrder } from './orderConfirmation.js'

const order: ConfirmationOrder = {
  id: 42,
  customer_name: 'Kim Kund',
  total_amount: '286.00',
  shipping_method_name: 'Ombud eller paketbox',
  shipping_price: '69.00',
  items: [
    { product_title: 'Ragnaröks Eld', unit_price: '89.00', quantity: 1 },
    { product_title: 'Mjölners Smak', unit_price: '64.00', quantity: 2 },
  ],
}

// Intl skriver ett hårt mellanslag före kr
const kr = (text: string) => text.replace(' kr', ' kr')

describe('orderConfirmation', () => {
  test('ordernumret står i ämnesraden', () => {
    assert.equal(orderConfirmation(order).subject, 'Orderbekräftelse #42 från Vikingsås')
  })

  test('html har namn, produkter med antal och pris, frakt och totalsumma', () => {
    const { html } = orderConfirmation(order)
    assert.match(html, /Kim Kund/)
    assert.match(html, /Ragnaröks Eld/)
    assert.match(html, /Mjölners Smak/)
    assert.ok(html.includes(kr('128,00 kr')), 'två flaskor à 64 kr')
    assert.ok(html.includes('Frakt, Ombud eller paketbox'))
    assert.ok(html.includes(kr('286,00 kr')))
  })

  test('text har samma innehåll utan HTML', () => {
    const { text } = orderConfirmation(order)
    assert.ok(!text.includes('<'))
    assert.ok(text.includes('Ordernummer #42'))
    assert.ok(text.includes(kr('Mjölners Smak x 2: 128,00 kr')))
    assert.ok(text.includes(kr('Totalt: 286,00 kr')))
  })

  test('fri frakt skrivs ut som text', () => {
    const { html, text } = orderConfirmation({ ...order, shipping_price: '0.00' })
    assert.ok(html.includes('Fri frakt'))
    assert.ok(text.includes('Frakt, Ombud eller paketbox: Fri frakt'))
  })

  test('order utan frakt har ingen fraktrad', () => {
    const { html } = orderConfirmation({ ...order, shipping_method_name: null, shipping_price: null })
    assert.ok(!html.includes('Frakt,'))
  })

  test('kundens namn escapas i HTML:en', () => {
    const { html } = orderConfirmation({ ...order, customer_name: '<a href="https://evil.example">Klicka</a>' })
    assert.ok(!html.includes('<a href'))
    assert.ok(html.includes('&lt;a href=&quot;https://evil.example&quot;&gt;Klicka&lt;/a&gt;'))
  })

  test('produktnamn escapas också', () => {
    const { html } = orderConfirmation({
      ...order,
      items: [{ product_title: '<img src=x onerror=alert(1)>', unit_price: '10.00', quantity: 1 }],
    })
    assert.ok(!html.includes('<img'))
  })
})

describe('escapeHtml', () => {
  test('alla fem tecknen byts ut', () => {
    assert.equal(escapeHtml(`<>&"'`), '&lt;&gt;&amp;&quot;&#39;')
  })

  test('& byts först, så att redan escapad text inte blir dubbel', () => {
    assert.equal(escapeHtml('&lt;'), '&amp;lt;')
  })

  test('vanlig text med å, ä och ö är orörd', () => {
    assert.equal(escapeHtml('Åsa Öberg'), 'Åsa Öberg')
  })
})
