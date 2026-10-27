import { useContext, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { formatCurrency } from '../utils/format'
import { CartContext } from '../context/CartContext'

type Order = {
  id: number
  total_amount: string
  payment_status: 'Obetald' | 'Betald' | 'Avbruten'
  items: { product_title: string; unit_price: string; quantity: number }[]
}

// Webhooken från Stripe brukar komma inom några sekunder.
// Så länge ordern är obetald frågar sidan servern igen. Sidan ändrar aldrig statusen själv.
const POLL_MS = 2000
const MAX_TRIES = 10

function ThankYouPage() {
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [order, setOrder] = useState<Order | null>(null)
  const [error, setError] = useState('')
  const { refreshCount } = useContext(CartContext)

  useEffect(() => {
    if (!sessionId) return
    const url = `/api/orders/session/${encodeURIComponent(sessionId)}`
    let ignore = false
    let tries = 0
    let timer: number | undefined

    function load() {
      fetch(url)
        .then(async (res) => {
          const data = await res.json()
          if (!res.ok) throw new Error(data.error)
          return data.order as Order
        })
        .then((data) => {
          if (ignore) return
          setOrder(data)
          tries += 1
          if (data.payment_status === 'Obetald' && tries < MAX_TRIES) {
            timer = window.setTimeout(load, POLL_MS)
          }
        })
        .catch(() => {
          if (!ignore) setError('Vi hittade ingen order.')
        })
    }

    load()
    return () => {
      ignore = true
      clearTimeout(timer)
    }
  }, [sessionId])

  // Webhooken har tömt varukorgen, så siffran i menyn ska uppdateras
  const paid = order?.payment_status === 'Betald'
  useEffect(() => {
    if (paid) refreshCount()
  }, [paid, refreshCount])

  if (!sessionId || error) {
    return (
      <main className="thank-you-page">
        <h1>Ingen order</h1>
        <p>{error || 'Vi hittade ingen order.'}</p>
      </main>
    )
  }

  if (!order) {
    return (
      <main className="thank-you-page">
        <p>Hämtar din order...</p>
      </main>
    )
  }

  return (
    <main className="thank-you-page">
      {order.payment_status === 'Betald' && <h1>Tack för din beställning!</h1>}
      {order.payment_status === 'Obetald' && <h1>Väntar på betalningen</h1>}
      {order.payment_status === 'Avbruten' && <h1>Betalningen avbröts</h1>}

      <p className="order-number">Ordernummer: #{order.id}</p>

      {order.payment_status === 'Betald' && (
        <p>Betalningen är klar. Din order skickas så snart som möjligt.</p>
      )}
      {order.payment_status === 'Obetald' && (
        <p>Vi har inte fått bekräftelse från Stripe än. Ladda om sidan om en liten stund.</p>
      )}
      {order.payment_status === 'Avbruten' && (
        <p>Ordern betalades aldrig. Dina varor ligger kvar i varukorgen.</p>
      )}

      <section className="order-summary">
        <h2>Din order</h2>
        <ul>
          {order.items.map((item) => (
            <li key={item.product_title}>
              <span>
                {item.product_title} x {item.quantity}
              </span>
              <span>{formatCurrency(Number(item.unit_price) * item.quantity)}</span>
            </li>
          ))}
        </ul>
        <p className="summary-total">
          <span>Totalt </span>
          <strong>{formatCurrency(order.total_amount)}</strong>
        </p>
      </section>
    </main>
  )
}

export default ThankYouPage
