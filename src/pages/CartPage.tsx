import { useEffect, useState } from 'react'
import type { CartItem } from '../types/types'
import { Link } from 'react-router'

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
          <ul className="cart-list">
            {cartItems.map((item) => (
              <li className="cart-item" key={item.id}>
                <img
                  className="cart-item-image"
                  src={item.image_url}
                  alt={item.title}
                />
                <h2 className="cart-item-title">{item.title}</h2>
                <p className="cart-item-price">
                  {Number(item.price)} kr per st
                </p>
                <p className="cart-item-quantity">
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

                <p className="cart-item-sum">
                  {Number(item.price) * item.quantity} kr
                </p>
              </li>
            ))}
          </ul>
          <p className="cart-total">
            <span>Totalt</span>
            <strong>{total} kr</strong>
          </p>
          <Link to="/kassa" className="button">
            Gå till kassan
          </Link>
        </>
      )}
    </main>
  )
}

export default CartPage
