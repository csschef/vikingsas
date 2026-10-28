import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { CaretRightIcon } from '@phosphor-icons/react'
import type { Product } from '../types/types'
import { formatCurrency } from '../utils/format'
import Switch from '../components/Switch'

type ImportReport = {
  format: string
  created: number
  updated: number
  skipped: { sku: string; reason: string }[]
  searchIndexed: boolean
}

function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [importing, setImporting] = useState(false)
  const [importReport, setImportReport] = useState<ImportReport | null>(null)
  const [importError, setImportError] = useState('')
  const location = useLocation()
  // Formuläret skickar med searchIndexed hit efter att en produkt sparats
  const [searchWarning, setSearchWarning] = useState(
    location.state?.searchIndexed === false,
  )

  function loadProducts() {
    fetch('/api/admin/products')
      .then((res) => res.json())
      .then((data) => setProducts(data.products))
      .catch((error) => console.error('Kunde inte hämta produkter', error))
  }

  useEffect(() => {
    loadProducts()
  }, [])

  async function importCatalog(format: 'csv' | 'xml') {
    setImporting(true)
    setImportReport(null)
    setImportError('')
    try {
      const res = await fetch(`/api/admin/import/${format}`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) {
        setImportError(data.error ?? 'Importen misslyckades')
        return
      }
      setImportReport(data)
      loadProducts()
    } catch {
      setImportError('Importen misslyckades. Försök igen om en stund.')
    } finally {
      setImporting(false)
    }
  }

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
        setSearchWarning(data.searchIndexed === false)
      })
      .catch((error) => console.error('Kunde inte uppdatera produkten', error))
  }

  return (
    <main className="admin-products-page">
      <div className="admin-page-header">
        <h1>Produkter</h1>
        <div className="admin-page-actions">
          <button
            type="button"
            className="button"
            onClick={() => importCatalog('csv')}
            disabled={importing}
          >
            Importera CSV
          </button>
          <button
            type="button"
            className="button"
            onClick={() => importCatalog('xml')}
            disabled={importing}
          >
            Importera XML
          </button>
          <Link to="/admin/produkter/ny" className="button">
            Ny produkt
          </Link>
        </div>
      </div>

      {importing && <p className="import-report">Importerar...</p>}
      {importError && <p className="form-error">{importError}</p>}
      {searchWarning && (
        <p className="form-error">
          Produkten är sparad, men sökindexet kunde inte uppdateras. Sökningen
          kan visa gammal information tills det fungerar igen.
        </p>
      )}
      {importReport && (
        <section className="import-report">
          <h2>Import från {importReport.format.toUpperCase()}</h2>
          <p>
            {importReport.created} nya, {importReport.updated} uppdaterade,{' '}
            {importReport.skipped.length} överhoppade
          </p>
          {!importReport.searchIndexed && (
            <p className="form-error">
              Produkterna är sparade, men sökindexet kunde inte uppdateras.
              Sökningen kan visa gammal information tills det fungerar igen.
            </p>
          )}
          {importReport.skipped.length > 0 && (
            <ul>
              {importReport.skipped.map((item) => (
                <li key={item.sku}>
                  {item.sku}: {item.reason}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <table className="admin-table">
        <thead>
          <tr>
            <th>Artikelnr</th>
            <th>Titel</th>
            <th>Styrka</th>
            <th>Pris</th>
            <th>Lagersaldo</th>
            <th>Status</th>
            <th>Aktiv / Inaktiv</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id}>
              <td>{product.sku}</td>
              <td>{product.title}</td>
              <td>{product.heat_level}</td>
              <td>{formatCurrency(product.price)}</td>
              <td>{product.stock ?? 'Saknas'}</td>
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
