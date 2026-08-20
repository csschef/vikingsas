const currencyFormatter = new Intl.NumberFormat('sv-SE', {
  style: 'currency',
  currency: 'SEK',
})

export function formatCurrency(amount: number | string) {
  return currencyFormatter.format(Number(amount))
}

const orderDateFormatter = new Intl.DateTimeFormat('sv-SE', {
  dateStyle: 'long',
  timeStyle: 'short',
})

export function formatOrderDate(dateString: string) {
  return orderDateFormatter.format(new Date(dateString))
}
