import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import type { SearchResult } from '../types/types'
import ProductCard from '../components/ProductCard'

const PAGE_SIZE = 12

function ProductsPage() {
  // Söktext och sida läses från adressen, t.ex. /produkter?q=habanero&page=2
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const page = Number(searchParams.get('page') ?? 1)

  const [text, setText] = useState(query)
  const [result, setResult] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const paginationRef = useRef<HTMLElement>(null)
  // Nästa går till toppen, Föregående till bläddringen längst ner
  const scrollAfterLoad = useRef<'top' | 'bottom' | null>(null)

  // Ändras adressen utifrån, t.ex. med bakåtknappen, följer fältet med
  useEffect(() => {
    setText(query)
  }, [query])

  // Adressen ändras först när man slutat skriva en kort stund
  useEffect(() => {
    if (text === query) return
    const timer = setTimeout(() => {
      setSearchParams(text ? { q: text } : {}, { replace: true })
    }, 300)
    return () => clearTimeout(timer)
  }, [text, query, setSearchParams])

  useEffect(() => {
    // Hinner man söka igen innan svaret kommit ska det gamla svaret inte visas
    let ignore = false

    async function search() {
      setLoading(true)
      setError('')
      try {
        const params = new URLSearchParams({
          q: query,
          page: String(page),
          pageSize: String(PAGE_SIZE),
        })
        const res = await fetch(`/api/search?${params}`)
        const data = await res.json()
        if (ignore) return
        if (!res.ok) {
          setResult(null)
          setError(data.error ?? 'Sökningen misslyckades')
          return
        }
        setResult(data)
      } catch {
        if (!ignore) {
          setResult(null)
          setError('Sökningen fungerar inte just nu. Försök igen om en stund.')
        }
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    search()
    return () => {
      ignore = true
    }
  }, [query, page])

  // Körs när den nya sidan har ritats ut, först då vet vi hur lång sidan är
  useEffect(() => {
    if (scrollAfterLoad.current === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    if (scrollAfterLoad.current === 'bottom') {
      paginationRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
    }
    scrollAfterLoad.current = null
  }, [result])

  function goToPage(newPage: number) {
    scrollAfterLoad.current = newPage > page ? 'top' : 'bottom'
    setSearchParams(query ? { q: query, page: String(newPage) } : { page: String(newPage) })
  }

  function statusText() {
    if (!result) return 'Söker...'
    const { total } = result.meta
    if (total === 0) return 'Inga produkter hittades'
    if (query) return `${total} ${total === 1 ? 'träff' : 'träffar'} för "${query}"`
    return `${total} ${total === 1 ? 'produkt' : 'produkter'}`
  }

  return (
    <main className="products-page">
      <h1>Produkter</h1>

      <input
        type="search"
        className="search-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Sök bland våra produkter"
        aria-label="Sök produkter"
      />

      {error ? (
        <p className="form-error">{error}</p>
      ) : (
        <p className="search-status">{statusText()}</p>
      )}

      {result && result.products.length > 0 && (
        <div className={loading ? 'product-grid is-loading' : 'product-grid'}>
          {result.products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {result && result.meta.totalPages > 1 && (
        <nav ref={paginationRef} className="pagination" aria-label="Sidor">
          <button
            type="button"
            className="button"
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
          >
            Föregående
          </button>
          <span>
            Sida {page} av {result.meta.totalPages}
          </span>
          <button
            type="button"
            className="button"
            onClick={() => goToPage(page + 1)}
            disabled={page >= result.meta.totalPages}
          >
            Nästa
          </button>
        </nav>
      )}
    </main>
  )
}

export default ProductsPage
