import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import type { Order } from '../types/types'
import { formatCurrency } from '../utils/format'
import { formatOrderDate } from '../utils/format'

function AdminOrderDetailPage() {
  const { id } = useParams()
  const [order, setOrder] = useState<Order | null>(null)

  function changeOrderStatus(newStatus: Order['status']) {
    if (!id) return
    fetch(`/api/admin/orders/${id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: newStatus }),
    })
      .then((res) => res.json())
      .then((_data) => {
        setOrder((prev) => prev && { ...prev, status: newStatus })
      })
      .catch((error) =>
        console.error('Kunde inte uppdatera beställning', error),
      )
  }

  useEffect(() => {
    if (!id) return
    fetch(`/api/admin/orders/${id}`)
      .then((res) => res.json())
      .then((data) => setOrder(data.order))
      .catch((error) => console.error('Kunde inte hämta beställning', error))
  }, [id])

  if (!order) {
    return <div>Laddar beställning...</div>
  }

  return (
    <main className="admin-order-detail-page">
      <div className="admin-page-header">
        <h1>Beställning #{order.id}</h1>
      </div>
      <div className="admin-order-info">
        <p>Inkom: {formatOrderDate(order.created_at)}</p>
        <p>Kund: {order.customer_name}</p>
        <p>Email: {order.customer_email}</p>
        <p>Summa: {formatCurrency(order.total_amount)}</p>
        <select
          value={order.status}
          onChange={(e) => changeOrderStatus(e.target.value as Order['status'])}
        >
          <option value="Beställd">Beställd</option>
          <option value="Behandlas">Behandlas</option>
          <option value="Levererad">Levererad</option>
          <option value="Återbetald">Återbetald</option>
        </select>
      </div>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Produkt</th>
            <th>Antal</th>
            <th>Pris (st)</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.product_id}>
              <td>{item.product_title}</td>
              <td>{item.quantity}</td>
              <td>{formatCurrency(item.unit_price)}</td>
              <td>{formatCurrency(item.unit_price * item.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}

export default AdminOrderDetailPage
