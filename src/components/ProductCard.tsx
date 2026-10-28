import { useState, useContext } from 'react'
import type { SearchProduct } from '../types/types'
import { CartContext } from '../context/CartContext'
import { CurrencyContext } from '../context/CurrencyContext'
import QuantityPicker from './QuantityPicker'

type ProductCardProps = {
  product: SearchProduct
}

function ProductCard({ product }: ProductCardProps) {
  const [addedToCart, setAddedToCart] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const { refreshCount } = useContext(CartContext)
  const { formatPrice } = useContext(CurrencyContext)
  // Tomt saldo betyder att vi inte vet, och då säljer vi inte
  const inStock = product.stock !== null && product.stock > 0

  function addToCart() {
    fetch('/api/cart', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ product_id: product.id, quantity }),
    })
      .then((res) => res.json())
      .then(() => {
        setAddedToCart(true)
        setTimeout(() => setAddedToCart(false), 1000)
        refreshCount()
        setQuantity(1)
      })
      .catch((error) => {
        console.error('Kunde inte lägga till produkt i varukorgen:', error)
      })
  }

  return (
    <article className="product-card">
      {/* De importerade produkterna har ingen bild än */}
      <div className="product-card-image">
        {product.image_url ? (
          <img src={product.image_url} alt={product.title} loading="lazy" />
        ) : (
          <p className="product-card-no-image">Bild kommer snart</p>
        )}
      </div>

      <div className="product-card-info">
        {product.category && (
          <p className="product-card-category">{product.category}</p>
        )}
        <h2>{product.title}</h2>
        {product.heat_level !== null && (
          <p className="product-card-heat">Styrka {product.heat_level} av 10</p>
        )}
        <p className="product-card-price">{formatPrice(product.price)}</p>
        <div className="add-to-cart">
          {inStock && (
            <QuantityPicker
              value={quantity}
              max={product.stock ?? 0}
              onChange={setQuantity}
            />
          )}
          <button
            type="button"
            className={addedToCart ? 'is-added' : ''}
            onClick={addToCart}
            disabled={!inStock}
          >
            {inStock
              ? addedToCart
                ? 'Tillagd'
                : 'Lägg i varukorgen'
              : 'Slut i lager'}
          </button>
        </div>
      </div>
    </article>
  )
}

export default ProductCard
