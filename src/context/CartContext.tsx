import { createContext, useState, useEffect, type ReactNode } from 'react'
import type { CartItem } from '../types/types'

type CartContextType = {
  count: number
  refreshCount: () => void
}

export const CartContext = createContext<CartContextType>({
  count: 0,
  refreshCount: () => {},
})

export function CartProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0)

  function refreshCount() {
    fetch('/api/cart')
      .then((res) => res.json())
      .then((data) => {
        const total = data.cart_items.reduce(
          (summa: number, item: CartItem) => summa + item.quantity,
          0,
        )
        setCount(total)
      })
      .catch((error) => console.error('Kunde inte hämta varukorgen', error))
  }

  useEffect(() => {
    refreshCount()
  }, [])

  return <CartContext value={{ count, refreshCount }}>{children}</CartContext>
}
