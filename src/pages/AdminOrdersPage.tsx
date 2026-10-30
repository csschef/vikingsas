import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { CaretRightIcon } from '@phosphor-icons/react'
import type { Order } from '../types/types'
import { formatCurrency, formatOrderDate } from '../utils/format'

const statusClass: Record<Order['status'], string> = {
  Beställd: 'status-pending',
  Behandlas: 'status-processing',
  Levererad: 'status-delivered',
  Återbetald: 'status-refunded',
}

const paymentClass: Record<Order['payment_status'], string> = {
  Obetald: 'status-pending',
  Betald: 'status-active',
  Avbruten: 'status-inactive',
}

// Bara ordrar som ska skickas behöver ett ombud, samma regel som servern
function needsServicePoint(order: Order) {
  return order.service_point_status === 'Väntar' && order.payment_status === 'Betald' && order.status !== 'Återbetald'
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
            <th>Datum</th>
            <th>Kund</th>
            <th>Email</th>
            <th>Summa</th>
            <th>Frakt</th>
            <th>Betalning</th>
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
                <div className="admin-shipping-cell">
                  {order.shipping_method_name
                    ? `${order.shipping_method_name}, ${Number(order.shipping_price) === 0 ? 'fri frakt' : formatCurrency(order.shipping_price ?? 0)}`
                    : '-'}
                  {needsServicePoint(order) && <span className="status-pill status-processing">Ombud saknas</span>}
                </div>
              </td>
              <td>
                <span className={`status-pill ${paymentClass[order.payment_status]}`}>
                  {order.payment_status}
                </span>
              </td>
              <td>
                <span className={`status-pill ${statusClass[order.status]}`}>
                  {order.status}
                </span>
              </td>
              <td className="admin-table-actions">
                <Link to={`/admin/ordrar/${order.id}`}>
                  Detaljer
                  <CaretRightIcon size={14} weight="bold" />
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
