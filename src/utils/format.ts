export function formatCurrency(amount: number | string, currency = 'SEK') {
  const formatter = new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency,
  })
  return formatter.format(Number(amount))
}

const orderDateFormatter = new Intl.DateTimeFormat('sv-SE', {
  dateStyle: 'long',
  timeStyle: 'short',
})

export function formatOrderDate(dateString: string) {
  return orderDateFormatter.format(new Date(dateString))
}
