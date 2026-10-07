const CURRENCIES = ['EUR', 'NOK', 'DKK']

type Rates = {
  base: string
  date: string
  rates: Record<string, number>
}

type FrankfurterResponse = {
  amount: number
  base: string
  date: string
  rates: Record<string, number>
}

export async function getRates(): Promise<Rates> {
  const baseUrl = process.env.CURRENCY_API_URL
  if (!baseUrl) {
    throw new Error('CURRENCY_API_URL saknas i miljövariablerna')
  }

  const url = new URL(`${baseUrl}/latest`)
  url.searchParams.set('base', 'SEK')
  url.searchParams.set('symbols', CURRENCIES.join(','))

  const response = await fetch(url, { signal: AbortSignal.timeout(5000) })
  if (!response.ok) {
    throw new Error(`Frankfurter svarade med status ${response.status}`)
  }

  const data = (await response.json()) as FrankfurterResponse

  // Frankfurter skickar inte med basvalutan, så SEK läggs till här
  return {
    base: data.base,
    date: data.date,
    rates: { [data.base]: 1, ...data.rates },
  }
}
