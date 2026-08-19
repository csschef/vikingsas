import type { Product } from '../types/types'
import { useRef, useState, useEffect, useContext } from 'react'
import { CartContext } from '../context/CartContext'

type ProductSectionProps = {
  product: Product
  index: number
}

function ProductSection({ product, index }: ProductSectionProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)
  const [addedToCart, setAddedToCart] = useState(false)
  const { refreshCount } = useContext(CartContext)

  useEffect(() => {
    const element = sectionRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible(true)
        }
      },
      { threshold: 0.25 },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  function addToCart() {
    fetch('/api/cart', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ product_id: product.id, quantity: 1 }),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log('Produkt tillagd i varukorgen:', data)
        setAddedToCart(true)
        setTimeout(() => setAddedToCart(false), 1000)
        refreshCount()
      })
      .catch((error) => {
        console.error('Kunde inte lägga till produkt i varukorgen:', error)
      })
  }

  const side = index % 2 === 0 ? 'product-left' : 'product-right'

  return (
    <section
      ref={sectionRef}
      className={visible ? `product ${side} is-visible` : `product ${side}`}
      data-heat={product.heat_level}
    >
      <div className="product-image">
        <img src={product.image_url} alt={product.title} loading="lazy" />
      </div>

      <div className="product-info">
        <p className="heat">Styrka {product.heat_level} av 10</p>
        <h2>{product.title}</h2>
        <p className="description">{product.description}</p>
        <p className="price">
          {Number(product.price)} kr
          <span className="volume">{product.volume_ml} ml</span>
        </p>

        <details className="nutrition">
          <summary>Näringsvärde och ingredienser</summary>
          <p className="ingredients">{product.ingredients}</p>
          <table>
            <caption>Per 100 ml</caption>
            <tbody>
              <tr>
                <th scope="row">Energi</th>
                <td>
                  {product.energy_kj} kJ / {product.energy_kcal} kcal
                </td>
              </tr>
              <tr>
                <th scope="row">Fett</th>
                <td>{product.fat_g} g</td>
              </tr>
              <tr>
                <th scope="row">varav mättat fett</th>
                <td>{product.saturated_fat_g} g</td>
              </tr>
              <tr>
                <th scope="row">Kolhydrat</th>
                <td>{product.carbohydrate_g} g</td>
              </tr>
              <tr>
                <th scope="row">varav sockerarter</th>
                <td>{product.sugars_g} g</td>
              </tr>
              <tr>
                <th scope="row">Protein</th>
                <td>{product.protein_g} g</td>
              </tr>
              <tr>
                <th scope="row">Salt</th>
                <td>{product.salt_g} g</td>
              </tr>
            </tbody>
          </table>
        </details>

        <button
          type="button"
          className={addedToCart ? 'is-added' : ''}
          onClick={addToCart}
        >
          {addedToCart ? '✓ Tillagd' : 'Lägg i varukorgen'}
        </button>
      </div>
    </section>
  )
}

export default ProductSection
