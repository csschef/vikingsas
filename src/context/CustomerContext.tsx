import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react'
import type { Customer } from '../types/types'

type CustomerContextType = {
  customer: Customer | null
  loading: boolean
  refreshCustomer: () => void
  logout: () => Promise<void>
}

export const CustomerContext = createContext<CustomerContextType>({
  customer: null,
  loading: true,
  refreshCustomer: () => {},
  logout: async () => {},
})

// Vem som är inloggad vet bara servern. Kakan är httpOnly, så React frågar i stället.
export function CustomerProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshCustomer = useCallback(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => setCustomer(data.customer ?? null))
      .catch(() => setCustomer(null))
      .finally(() => setLoading(false))
  }, [])

  async function logout() {
    const res = await fetch('/api/auth/logout', { method: 'POST' })
    if (!res.ok) throw new Error('Utloggningen misslyckades')
    setCustomer(null)
  }

  useEffect(() => {
    refreshCustomer()
  }, [refreshCustomer])

  return <CustomerContext value={{ customer, loading, refreshCustomer, logout }}>{children}</CustomerContext>
}
