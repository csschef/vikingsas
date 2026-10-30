import { toOre } from './shippingPrice.js'

// En rad i varukorgen med priset från databasen. pg ger NUMERIC som text, därför är price en sträng.
export type CartLine = {
  title: string
  price: string
  quantity: number
}

// En rad som den skickas till betalningen, i ören
export type PaymentLine = {
  name: string
  unitAmountOre: number
  quantity: number
}

export function itemsTotal(items: CartLine[]) {
  return items.reduce((sum, item) => sum + toOre(Number(item.price)) * item.quantity, 0) / 100
}

// Samma rader används både för orderns summa och för Stripe, så att beloppen alltid är lika. Fri frakt ger ingen fraktrad.
export function buildPaymentLines(items: CartLine[], shipping: { name: string; price: number }) {
  const lines: PaymentLine[] = items.map((item) => ({
    name: item.title,
    unitAmountOre: toOre(Number(item.price)),
    quantity: item.quantity,
  }))
  if (shipping.price > 0) {
    lines.push({ name: `Frakt: ${shipping.name}`, unitAmountOre: toOre(shipping.price), quantity: 1 })
  }
  const totalOre = lines.reduce((sum, line) => sum + line.unitAmountOre * line.quantity, 0)
  return { lines, totalOre }
}
