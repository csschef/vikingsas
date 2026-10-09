import { z } from 'zod'
import { fetchJson } from '../lib/fetchJson.js'

const CURRENCIES = ['EUR', 'NOK', 'DKK']
const CACHE_MS = Number(process.env.CURRENCY_CACHE_SECONDS ?? 300) * 1000

let cache: { value: Rates; expiresAt: number } | null = null

type Rates = {
  base: string
  date: string
  rates: Record<string, number>
}

const FrankfurterResponseSchema = z.object({
  base: z.string(),
  date: z.string(),
  rates: z.record(z.string(), z.number().positive()),
})

export async function getRates(): Promise<Rates> {
  if (cache && cache.expiresAt > Date.now()) {
    return cache.value
  }

  const baseUrl = process.env.CURRENCY_API_URL
  if (!baseUrl) {
    throw new Error('CURRENCY_API_URL saknas i miljövariablerna')
  }

  const url = new URL(`${baseUrl}/latest`)
  url.searchParams.set('base', 'SEK')
  url.searchParams.set('symbols', CURRENCIES.join(','))

  const data = await fetchJson(url.toString())
  const parsed = FrankfurterResponseSchema.safeParse(data)
  if (!parsed.success) {
    throw new Error(`Frankfurter svarade i ett oväntat format:\n${z.prettifyError(parsed.error)}`)
  }

  // Frankfurter skickar inte med basvalutan, så SEK läggs till här
  const value = {
    base: parsed.data.base,
    date: parsed.data.date,
    rates: { [parsed.data.base]: 1, ...parsed.data.rates },
  }

  cache = { value, expiresAt: Date.now() + CACHE_MS }

  return value
}
