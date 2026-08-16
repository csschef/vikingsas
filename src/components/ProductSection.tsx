import type { Product } from '../types/types'

type ProductSectionProps = {
  product: Product
  index: number
}

function ProductSection({ product, index }: ProductSectionProps) {
  return (
    <section className={index % 2 === 0 ? 'product product-left' : 'product product-right'}>
      <div className="product-image">
        <img src={product.image_url} alt={product.title} />
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
                <td>{product.energy_kj} kJ / {product.energy_kcal} kcal</td>
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

        <button type="button">Lägg i varukorgen</button>
      </div>
    </section>
  )
}

export default ProductSection
