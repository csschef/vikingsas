import { fetchJson } from '../lib/fetchJson.js'

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

  const data = (await fetchJson(url.toString())) as FrankfurterResponse

  // Frankfurter skickar inte med basvalutan, så SEK läggs till här
  return {
    base: data.base,
    date: data.date,
    rates: { [data.base]: 1, ...data.rates },
  }
}
