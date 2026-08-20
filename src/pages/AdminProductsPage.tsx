import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { CaretRightIcon } from '@phosphor-icons/react'
import type { Product } from '../types/types'
import { formatCurrency } from '../utils/format'
import Switch from '../components/Switch'

function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])

  function loadProducts() {
    fetch('/api/admin/products')
      .then((res) => res.json())
      .then((data) => setProducts(data.products))
      .catch((error) => console.error('Kunde inte hämta produkter', error))
  }

  useEffect(() => {
    loadProducts()
  }, [])

  function toggleProductStatus(product: Product) {
    fetch(`/api/admin/products/${product.id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ is_active: !product.is_active }),
    })
      .then((res) => res.json())
      .then((data) => {
        setProducts((prev) =>
          prev.map((p) => (p.id === data.product.id ? data.product : p)),
        )
      })
      .catch((error) => console.error('Kunde inte uppdatera produkten', error))
  }

  return (
    <main className="admin-products-page">
      <div className="admin-page-header">
        <h1>Produkter</h1>
        <Link to="/admin/produkter/ny" className="button">
          Ny produkt
        </Link>
      </div>

      <table className="admin-table">
        <thead>
          <tr>
            <th>Titel</th>
            <th>Styrka</th>
            <th>Pris</th>
            <th>Status</th>
            <th>Aktiv / Inaktiv</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id}>
              <td>{product.title}</td>
              <td>{product.heat_level}</td>
              <td>{formatCurrency(product.price)}</td>
              <td>
                <span
                  className={
                    product.is_active
                      ? 'status-pill status-active'
                      : 'status-pill status-inactive'
                  }
                >
                  {product.is_active ? 'Aktiv' : 'Inaktiv'}
                </span>
              </td>
              <td>
                <Switch
                  checked={product.is_active}
                  onChange={() => toggleProductStatus(product)}
                  label={
                    product.is_active
                      ? `Inaktivera ${product.title}`
                      : `Aktivera ${product.title}`
                  }
                />
              </td>
              <td className="admin-table-actions">
                <Link to={`/admin/produkter/${product.id}`}>
                  Redigera
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

export default AdminProductsPage
