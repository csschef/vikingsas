import { useEffect, useState, type ChangeEvent, type SubmitEvent } from 'react'
import { useNavigate, useParams } from 'react-router'

type ProductFormData = {
  title: string
  description: string
  volume_ml: string
  price: string
  heat_level: string
  image_url: string
  ingredients: string
  energy_kj: string
  energy_kcal: string
  fat_g: string
  saturated_fat_g: string
  carbohydrate_g: string
  sugars_g: string
  protein_g: string
  salt_g: string
  is_active: boolean
}

const emptyProduct: ProductFormData = {
  title: '',
  description: '',
  volume_ml: '',
  price: '',
  heat_level: '',
  image_url: '',
  ingredients: '',
  energy_kj: '',
  energy_kcal: '',
  fat_g: '',
  saturated_fat_g: '',
  carbohydrate_g: '',
  sugars_g: '',
  protein_g: '',
  salt_g: '',
  is_active: true,
}

function AdminProductFormPage() {
  const { id } = useParams()
  const isEditMode = Boolean(id)
  const navigate = useNavigate()
  const [formData, setFormData] = useState<ProductFormData>(emptyProduct)

  useEffect(() => {
    if (!id) return
    fetch(`/api/admin/products/${id}`)
      .then((res) => res.json())
      .then((data) => {
        const product = data.product
        setFormData({
          title: product.title,
          description: product.description,
          volume_ml: String(product.volume_ml),
          price: product.price,
          heat_level: String(product.heat_level),
          image_url: product.image_url,
          ingredients: product.ingredients,
          energy_kj: String(product.energy_kj),
          energy_kcal: String(product.energy_kcal),
          fat_g: product.fat_g,
          saturated_fat_g: product.saturated_fat_g,
          carbohydrate_g: product.carbohydrate_g,
          sugars_g: product.sugars_g,
          protein_g: product.protein_g,
          salt_g: product.salt_g,
          is_active: product.is_active,
        })
      })
      .catch((error) => console.error('Kunde inte hämta produkten', error))
  }, [id])

  function handleChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const url = isEditMode ? `/api/admin/products/${id}` : '/api/admin/products'
    const method = isEditMode ? 'PUT' : 'POST'

    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error('Kunde inte spara produkten')
        }
        navigate('/admin/produkter')
      })
      .catch((error) => console.error(error))
  }

  return (
    <main className="admin-product-form-page">
      <h1>{isEditMode ? 'Redigera produkt' : 'Ny produkt'}</h1>
      <form onSubmit={handleSubmit} className="admin-product-form">
        <label>
          Titel
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Beskrivning
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Volym (ml)
          <input
            type="number"
            name="volume_ml"
            value={formData.volume_ml}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Pris (kr)
          <input
            type="number"
            step="0.01"
            name="price"
            value={formData.price}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Styrka (1-10)
          <input
            type="number"
            min="1"
            max="10"
            name="heat_level"
            value={formData.heat_level}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Bild-URL
          <input
            type="text"
            name="image_url"
            value={formData.image_url}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Ingredienser
          <textarea
            name="ingredients"
            value={formData.ingredients}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Energi (kJ)
          <input
            type="number"
            name="energy_kj"
            value={formData.energy_kj}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Energi (kcal)
          <input
            type="number"
            name="energy_kcal"
            value={formData.energy_kcal}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Fett (g)
          <input
            type="number"
            step="0.01"
            name="fat_g"
            value={formData.fat_g}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Varav mättat fett (g)
          <input
            type="number"
            step="0.01"
            name="saturated_fat_g"
            value={formData.saturated_fat_g}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Kolhydrat (g)
          <input
            type="number"
            step="0.01"
            name="carbohydrate_g"
            value={formData.carbohydrate_g}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Varav sockerarter (g)
          <input
            type="number"
            step="0.01"
            name="sugars_g"
            value={formData.sugars_g}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Protein (g)
          <input
            type="number"
            step="0.01"
            name="protein_g"
            value={formData.protein_g}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Salt (g)
          <input
            type="number"
            step="0.01"
            name="salt_g"
            value={formData.salt_g}
            onChange={handleChange}
            required
          />
        </label>
        <button type="submit">
          {isEditMode ? 'Spara ändringar' : 'Skapa produkt'}
        </button>
      </form>
    </main>
  )
}

export default AdminProductFormPage
