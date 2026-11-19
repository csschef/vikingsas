// Orderbekräftelsens innehåll. Butikens egen kod, Resend vet ingenting om ordrar.

export type ConfirmationOrder = {
  id: number
  customer_name: string
  total_amount: string | number
  shipping_method_name: string | null
  shipping_price: string | number | null
  items: { product_title: string; unit_price: string | number; quantity: number }[]
}

// E-post klarar inte stilmallar, så färgerna skrivs direkt i HTML:en. Accenten är butikens --glow.
const COLORS = { accent: '#ef5417', text: '#1a1a1a', muted: '#6b6b6b', line: '#e5e1dc' }

const kronor = new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK' })
const money = (amount: string | number) => kronor.format(Number(amount))

// Namn och produktnamn kommer utifrån. Escapas så att ett namn med <a href> inte blir en riktig länk i mejlet.
export function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function lines(order: ConfirmationOrder) {
  const rows = order.items.map((item) => ({
    name: item.product_title,
    quantity: String(item.quantity),
    price: money(Number(item.unit_price) * item.quantity),
  }))
  if (order.shipping_method_name) {
    rows.push({
      name: `Frakt, ${order.shipping_method_name}`,
      quantity: '',
      price: Number(order.shipping_price) === 0 ? 'Fri frakt' : money(order.shipping_price ?? 0),
    })
  }
  return rows
}

export function orderConfirmation(order: ConfirmationOrder) {
  const subject = `Orderbekräftelse #${order.id} från Vikingsås`
  const rows = lines(order)
  const total = money(order.total_amount)

  const cell = `padding: 8px 0; border-bottom: 1px solid ${COLORS.line};`
  const tableRows = rows
    .map(
      (row) => `
        <tr>
          <td style="${cell}">${escapeHtml(row.name)}</td>
          <td style="${cell} text-align: center;">${escapeHtml(row.quantity)}</td>
          <td style="${cell} text-align: right; white-space: nowrap;">${escapeHtml(row.price)}</td>
        </tr>`
    )
    .join('')

  const html = `<!doctype html>
<html lang="sv">
  <body style="margin: 0; padding: 24px; font-family: Arial, sans-serif; color: ${COLORS.text};">
    <h1 style="margin: 0 0 8px; font-size: 22px;">Tack för din beställning, ${escapeHtml(order.customer_name)}!</h1>
    <p style="margin: 0 0 24px; color: ${COLORS.accent}; font-weight: bold;">Ordernummer #${order.id}</p>
    <table style="width: 100%; max-width: 560px; border-collapse: collapse; font-size: 15px;">
      <thead>
        <tr>
          <th style="${cell} text-align: left; color: ${COLORS.muted};">Produkt</th>
          <th style="${cell} text-align: center; color: ${COLORS.muted};">Antal</th>
          <th style="${cell} text-align: right; color: ${COLORS.muted};">Pris</th>
        </tr>
      </thead>
      <tbody>${tableRows}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2" style="padding: 12px 0; font-weight: bold;">Totalt</td>
          <td style="padding: 12px 0; text-align: right; font-weight: bold; white-space: nowrap;">${escapeHtml(total)}</td>
        </tr>
      </tfoot>
    </table>
    <p style="margin: 24px 0 0; color: ${COLORS.muted}; font-size: 13px;">Betalningen är klar. Vi skickar din order så snart som möjligt.</p>
  </body>
</html>`

  const text = [
    `Tack för din beställning, ${order.customer_name}!`,
    `Ordernummer #${order.id}`,
    '',
    ...rows.map((row) => (row.quantity ? `${row.name} x ${row.quantity}: ${row.price}` : `${row.name}: ${row.price}`)),
    '',
    `Totalt: ${total}`,
    '',
    'Betalningen är klar. Vi skickar din order så snart som möjligt.',
  ].join('\n')

  return { subject, html, text }
}
