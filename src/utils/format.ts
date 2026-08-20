const currencyFormatter = new Intl.NumberFormat('sv-SE', {
  style: 'currency',
  currency: 'SEK',
})

export function formatCurrency(amount: number | string) {
  return currencyFormatter.format(Number(amount))
}
