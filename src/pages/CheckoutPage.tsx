import { useEffect, useState, type SubmitEvent } from 'react'
import { useNavigate } from 'react-router'
import type { CartItem } from '../types/types'

function CheckoutPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const navigate = useNavigate()
  const [cartItems, setCartItems] = useState<CartItem[]>([])

  useEffect(() => {
    fetch('/api/cart')
      .then((res) => res.json())
      .then((data) => setCartItems(data.cart_items))
      .catch((error) => console.error('Kunde inte hämta varukorgen', error))
  }, [])

  const total = cartItems.reduce(
    (summa, item) => summa + Number(item.price) * item.quantity,
    0,
  )

  const moms = ((total * 0.12) / 1.12).toLocaleString('sv-SE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ customer_name: name, customer_email: email }),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log('Order skapad', data)
        navigate('/tack')
      })
      .catch((error) => console.error('Kunde inte skapa order', error))
  }

  return (
    <main className="checkout-page">
      <h1>Kassa</h1>
      <div className="checkout-layout">
        <form onSubmit={handleSubmit}>
          <label>
            Namn:
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label>
            E-post:
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <button type="submit">Slutför köp</button>
        </form>
        <section className="order-summary">
          <h2>Din order</h2>
          <ul>
            {cartItems.map((item) => (
              <li key={item.id}>
                <span>
                  {item.title} x {item.quantity}
                </span>
                <span>{Number(item.price) * item.quantity} kr</span>
              </li>
            ))}
          </ul>
          <p className="summary-total">
            <span>Att betala </span>
            <strong>{total} kr</strong>
          </p>
          <p className="summary-vat">varav moms {moms} kr</p>
        </section>
      </div>
    </main>
  )
}

export default CheckoutPage
