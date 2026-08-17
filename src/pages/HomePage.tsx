import { useEffect, useState } from 'react'
import type { Product } from '../types/types'
import ProductSection from '../components/ProductSection'

function HomePage() {
  const [products, setProducts] = useState<Product[]>([])

  useEffect(() => {
    fetch('/api/products')
      .then((res) => res.json())
      .then((data) => setProducts(data.products))
      .catch((error) => console.error('Kunde inte hämta produkter', error))
  }, [])

  return (
    <>
      <header className="hero">
        <h1>Vikingsås</h1>
        <p>Placeholder-text i väntan på något bättre</p>
      </header>

      <main>
        {products.map((product, index) => (
          <ProductSection key={product.id} product={product} index={index} />
        ))}
      </main>
    </>
  )
}

export default HomePage
