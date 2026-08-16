import { useEffect, useState } from 'react'

type Product = {
  id: number
  title: string
}

function App() {
  const [products, setProducts] = useState<Product[]>([])

  useEffect(() => {
    fetch('/api/products')
      .then((res) => res.json())
      .then((data) => setProducts(data.products))
      .catch((error) => console.error('Kunde inte hämta produkter', error))
  }, [])

  return (
    <main>
      <h1>Chilisåser</h1>
      <ul>
        {products.map((product) => (
          <li key={product.id}>{product.title}</li>
        ))}
      </ul>
    </main>
  )
}

export default App
