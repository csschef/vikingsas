import { createContext, useState, useEffect, type ReactNode } from 'react'
import { formatCurrency } from '../utils/format'

type CurrencyContextType = {
  currency: string
  currencies: string[]
  changeCurrency: (currency: string) => void
  formatPrice: (amountInSek: number | string) => string
}

export const CurrencyContext = createContext<CurrencyContextType>({
  currency: 'SEK',
  currencies: [],
  changeCurrency: () => {},
  formatPrice: (amountInSek) => formatCurrency(amountInSek),
})

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [rates, setRates] = useState<Record<string, number>>({ SEK: 1 })
  const [selected, setSelected] = useState(localStorage.getItem('currency') ?? 'SEK')

  useEffect(() => {
    fetch('/api/currency/rates')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Servern svarade ${res.status}`)
        }
        return res.json()
      })
      .then((data) => setRates(data.rates))
      .catch((error) => console.error('Kunde inte hämta valutakurser', error))
  }, [])

  // Finns ingen kurs för valet, t.ex. om hämtningen misslyckades, används SEK
  const currency = rates[selected] ? selected : 'SEK'

  function changeCurrency(newCurrency: string) {
    setSelected(newCurrency)
    localStorage.setItem('currency', newCurrency)
  }

  function formatPrice(amountInSek: number | string) {
    return formatCurrency(Number(amountInSek) * rates[currency], currency)
  }

  return (
    <CurrencyContext
      value={{ currency, currencies: Object.keys(rates), changeCurrency, formatPrice }}
    >
      {children}
    </CurrencyContext>
  )
}
