import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import type { Order } from '../types/types'
import { formatCurrency, formatOrderDate } from '../utils/format'

const statusClass: Record<Order['status'], string> = {
  Beställd: 'status-pending',
  Behandlas: 'status-processing',
  Levererad: 'status-delivered',
  Återbetald: 'status-refunded',
}

function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])

  function loadOrders() {
    fetch('/api/admin/orders')
      .then((res) => res.json())
      .then((data) => setOrders(data.orders))
      .catch((error) => console.error('Kunde inte hämta beställningar', error))
  }

  useEffect(() => {
    loadOrders()
  }, [])

  return (
    <main className="admin-orders-page">
      <div className="admin-page-header">
        <h1>Ordrar</h1>
      </div>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Inkom</th>
            <th>Kund</th>
            <th>Email</th>
            <th>Summa</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td>{formatOrderDate(order.created_at)}</td>
              <td>{order.customer_name}</td>
              <td>{order.customer_email}</td>
              <td>{formatCurrency(order.total_amount)}</td>
              <td>
                <span className={`status-pill ${statusClass[order.status]}`}>
                  {order.status}
                </span>
              </td>
              <td className="admin-table-actions">
                <Link to={`/admin/ordrar/${order.id}`} type="button">
                  Detaljer
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}

export default AdminOrdersPage
