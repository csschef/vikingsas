import { useContext, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { CustomerContext } from '../context/CustomerContext'
import { formatCurrency, formatOrderDate } from '../utils/format'
import type { AccountOrder } from '../types/types'

// Servern skickar hit kunden med ?fel= när inloggningen inte gick hela vägen
const LOGIN_ERRORS: Record<string, string> = {
  avbruten: 'Inloggningen avbröts. Du är inte inloggad.',
  ogiltig: 'Inloggningen kunde inte kontrolleras. Försök logga in igen.',
  google: 'Inloggningen med Google gick inte att slutföra just nu. Försök igen om en stund.',
  'ej-verifierad': 'Ditt Google-konto har ingen bekräftad e-postadress och kan inte användas här.',
}

type OrdersState = { status: 'loading' } | { status: 'ready'; orders: AccountOrder[] } | { status: 'failed' }

function orderStatus(order: AccountOrder) {
  if (order.payment_status === 'Obetald') return 'Väntar på betalning'
  return order.status
}

function AccountPage() {
  const { customer, loading, refreshCustomer, logout } = useContext(CustomerContext)
  const [searchParams] = useSearchParams()
  const loginError = LOGIN_ERRORS[searchParams.get('fel') ?? '']
  const [orders, setOrders] = useState<OrdersState>({ status: 'loading' })
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')

  useEffect(() => {
    if (!customer) return
    let ignore = false
    fetch('/api/account/orders')
      .then(async (res) => {
        // Sessionen har gått ut sedan sidan laddades
        if (res.status === 401) {
          refreshCustomer()
          return
        }
        if (!res.ok) throw new Error('Beställningarna kunde inte hämtas')
        const data = await res.json()
        if (!ignore) setOrders({ status: 'ready', orders: data.orders })
      })
      .catch(() => {
        if (!ignore) setOrders({ status: 'failed' })
      })
    return () => {
      ignore = true
    }
  }, [customer, refreshCustomer])

  async function handleLogout() {
    setLoggingOut(true)
    setLogoutError('')
    try {
      await logout()
      setOrders({ status: 'loading' })
    } catch {
      setLogoutError('Utloggningen gick inte igenom. Försök igen.')
    } finally {
      setLoggingOut(false)
    }
  }

  if (loading) {
    return (
      <main className="account-page">
        <h1>Mina sidor</h1>
        <p>Hämtar...</p>
      </main>
    )
  }

  if (!customer) {
    return (
      <main className="account-page">
        <h1>Mina sidor</h1>
        {loginError && <p className="form-error" role="alert">{loginError}</p>}
        <p>Logga in med ditt Google-konto för att se dina beställningar. Du kan också handla utan att logga in.</p>
        {/* Vanlig länk och inte Link, eftersom servern tar emot den och skickar vidare till Google */}
        <a className="button" href="/api/auth/google">
          Logga in med Google
        </a>
      </main>
    )
  }

  return (
    <main className="account-page">
      <h1>Mina sidor</h1>
      {loginError && <p className="form-error" role="alert">{loginError}</p>}

      <div className="account-who">
        <p>
          Inloggad som <strong>{customer.name}</strong>, {customer.email}
        </p>
        <button type="button" className="account-logout" onClick={handleLogout} disabled={loggingOut}>
          Logga ut
        </button>
      </div>
      {logoutError && <p className="form-error" role="alert">{logoutError}</p>}

      <h2 className="account-heading">Dina beställningar</h2>
      {orders.status === 'loading' && <p>Hämtar dina beställningar...</p>}
      {orders.status === 'failed' && (
        <p className="form-error" role="alert">
          Beställningarna kunde inte hämtas. Ladda om sidan om en stund.
        </p>
      )}
      {orders.status === 'ready' && orders.orders.length === 0 && (
        <p>Du har inga beställningar än. Det du köper när du är inloggad hamnar här.</p>
      )}
      {orders.status === 'ready' &&
        orders.orders.map((order) => (
          <article key={order.id} className="order-summary account-order">
            <header className="account-order-header">
              <span className="order-number">#{order.id}</span>
              <span className="account-order-date">{formatOrderDate(order.created_at)}</span>
            </header>
            <p className="account-order-status">{orderStatus(order)}</p>
            <ul>
              {order.items.map((item, index) => (
                <li key={index}>
                  <span>
                    {item.product_title} x {item.quantity}
                  </span>
                  <span>{formatCurrency(Number(item.unit_price) * item.quantity)}</span>
                </li>
              ))}
              {order.shipping_method_name && (
                <li>
                  <span>Frakt, {order.shipping_method_name}</span>
                  <span>
                    {Number(order.shipping_price) === 0 ? 'Fri frakt' : formatCurrency(order.shipping_price ?? 0)}
                  </span>
                </li>
              )}
            </ul>
            <p className="summary-total">
              <span>Totalt </span>
              <strong>{formatCurrency(order.total_amount)}</strong>
            </p>
          </article>
        ))}
    </main>
  )
}

export default AccountPage
