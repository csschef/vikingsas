import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import type { Product } from '../types/types'

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

  function deleteProduct(id: number) {
    fetch(`/api/admin/products/${id}`, { method: 'DELETE' })
      .then(() => loadProducts())
      .catch((error) => console.error('Kunde inte ta bort produkten', error))
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
            <th></th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id}>
              <td>{product.title}</td>
              <td>{product.heat_level}</td>
              <td>{Number(product.price)} kr</td>
              <td>{product.is_active ? 'Aktiv' : 'Inaktiv'}</td>
              <td className="admin-table-actions">
                <Link to={`/admin/produkter/${product.id}`}>Redigera</Link>
                <button type="button" onClick={() => deleteProduct(product.id)}>
                  Ta bort
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}

export default AdminProductsPage
