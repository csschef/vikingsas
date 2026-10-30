import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import type { Order, OrderShipping, ServicePoint } from '../types/types'
import { formatCurrency } from '../utils/format'
import { formatOrderDate } from '../utils/format'
import { servicePointAddress } from '../utils/shipping'
import StatusDropdown from '../components/StatusDropdown'
import ServicePointPicker from '../components/ServicePointPicker'

type ServicePointChoices = { servicePoints: ServicePoint[]; unavailableKinds: ServicePoint['kind'][] }

function AdminOrderDetailPage() {
  const { id } = useParams()
  const [order, setOrder] = useState<Order | null>(null)
  const [choices, setChoices] = useState<ServicePointChoices | null>(null)
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null)
  const [loadingPoints, setLoadingPoints] = useState(false)
  const [saving, setSaving] = useState(false)
  const [shippingError, setShippingError] = useState('')

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

  // Ombuden hämtas via servern för orderns postnummer
  function loadServicePoints() {
    if (!id) return
    setShippingError('')
    setLoadingPoints(true)
    fetch(`/api/admin/orders/${id}/service-points`)
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setChoices(data)
      })
      .catch((error) => setShippingError(error instanceof Error ? error.message : 'Ombuden kunde inte hämtas.'))
      .finally(() => setLoadingPoints(false))
  }

  // Servern kontrollerar valet mot PostNord igen och sparar bara om ordern fortfarande väntar på ombud
  function saveServicePoint() {
    if (!id || !selectedPointId) return
    setShippingError('')
    setSaving(true)
    fetch(`/api/admin/orders/${id}/service-point`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ service_point_id: selectedPointId }),
    })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setOrder((prev) => prev && { ...prev, ...(data.order as OrderShipping) })
        setChoices(null)
        setSelectedPointId(null)
      })
      .catch((error) => setShippingError(error instanceof Error ? error.message : 'Ombudet kunde inte sparas.'))
      .finally(() => setSaving(false))
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

  // Samma regel som servern: bara betalda ordrar som inte är återbetalda får ett ombud
  const canAssign = order.payment_status === 'Betald' && order.status !== 'Återbetald'

  return (
    <main className="admin-order-detail-page">
      <div className="admin-page-header">
        <h1>Order #{order.id}</h1>
        <StatusDropdown value={order.status} onChange={changeOrderStatus} />
      </div>
      <div className="admin-order-card">
        <div className="admin-order-info">
          <p>Inkom: {formatOrderDate(order.created_at)}</p>
          <p>Kund: {order.customer_name}</p>
          <p>Email: {order.customer_email}</p>
          <p>Telefon: {order.customer_phone ?? 'Saknas'}</p>
          <p>
            Adress:{' '}
            {order.shipping_street
              ? `${order.shipping_street}, ${order.shipping_postal_code} ${order.shipping_city}`
              : 'Saknas'}
          </p>
          <p>Summa: {formatCurrency(order.total_amount)}</p>
          <p>Betalning: {order.payment_status}</p>
        </div>

        <section className="admin-shipping">
          <h2>Frakt</h2>
          {!order.shipping_method && <p>Ordern lades innan butiken hade frakt.</p>}
          {order.shipping_method && (
            <>
              <p>Fraktsätt: {order.shipping_method_name}</p>
              <p>Fraktpris: {Number(order.shipping_price) === 0 ? 'Fri frakt' : formatCurrency(order.shipping_price ?? 0)}</p>
              {order.shipping_method === 'hem' && <p>Levereras till kundens adress.</p>}
              {order.service_point_status === 'Vald' && (
                <>
                  <p>Ombud: {servicePointAddress(order)}</p>
                  <p>
                    Ombudets id: {order.service_point_id} ({order.service_point_country_code})
                  </p>
                </>
              )}
              {order.service_point_status === 'Väntar' && (
                <>
                  <p>Ombud: väntar på att väljas.</p>
                  {!canAssign && <p>Ombud kan bara väljas för betalda ordrar som inte är återbetalda.</p>}
                  {canAssign && !choices && (
                    <button type="button" className="button" onClick={loadServicePoints} disabled={loadingPoints}>
                      {loadingPoints ? 'Hämtar ombud...' : 'Hämta ombud'}
                    </button>
                  )}
                  {canAssign && choices && (
                    <>
                      <ServicePointPicker
                        servicePoints={choices.servicePoints}
                        unavailableKinds={choices.unavailableKinds}
                        selectedId={selectedPointId}
                        onSelect={setSelectedPointId}
                      />
                      <button type="button" className="button" onClick={saveServicePoint} disabled={!selectedPointId || saving}>
                        {saving ? 'Sparar...' : 'Spara ombud'}
                      </button>
                    </>
                  )}
                </>
              )}
              {shippingError && <p className="form-error">{shippingError}</p>}
            </>
          )}
        </section>

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
      </div>
    </main>
  )
}

export default AdminOrderDetailPage
