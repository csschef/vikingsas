import { useEffect, useState } from 'react'
import type { CartItem } from '../types/types'

function CartPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([])

  function loadCart() {
    fetch('/api/cart')
      .then((res) => res.json())
      .then((data) => setCartItems(data.cart_items))
      .catch((error) => console.error('Kunde inte hämta varukorgen', error))
  }

  function updateQuantity(id: number, quantity: number) {
    fetch(`/api/cart/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ quantity }),
    })
      .then(() => loadCart())
      .catch((error) => console.error('Kunde inte uppdatera kvantitet', error))
  }

  useEffect(() => {
    loadCart()
  }, [])

  const total = cartItems.reduce(
    (summa, item) => summa + Number(item.price) * item.quantity,
    0,
  )

  return (
    <main className="cart-page">
      <h1>Din varukorg</h1>
      {cartItems.length === 0 ? (
        <p>Din varukorg är tom.</p>
      ) : (
        <>
          <ul>
            {cartItems.map((item) => (
              <li key={item.id}>
                <img src={item.image_url} alt={item.title} width="100" />
                <h2>{item.title}</h2>
                <p>Pris: {Number(item.price)} kr</p>
                <p>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  >
                    -
                  </button>
                  {item.quantity}
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  >
                    +
                  </button>
                </p>

                <p>Summa: {Number(item.price) * item.quantity} kr</p>
              </li>
            ))}
          </ul>
          <p>
            <strong>Totalt: {total} kr</strong>
          </p>
        </>
      )}
    </main>
  )
}

export default CartPage
