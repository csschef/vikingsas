import { useEffect, useState, type ChangeEvent, type SubmitEvent } from 'react'
import { useNavigate, useParams } from 'react-router'

type ProductFormData = {
  sku: string
  title: string
  description: string
  volume_ml: string
  price: string
  stock: string
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

type FieldErrors = Partial<Record<keyof ProductFormData, string>>

const emptyProduct: ProductFormData = {
  sku: '',
  title: '',
  description: '',
  volume_ml: '',
  price: '',
  stock: '',
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

const integerFields = [
  'volume_ml',
  'energy_kj',
  'energy_kcal',
  'stock',
] as const
const gramFields = [
  'fat_g',
  'saturated_fat_g',
  'carbohydrate_g',
  'sugars_g',
  'protein_g',
  'salt_g',
] as const

// Formuläret har noValidate, så det webbläsaren kollade förut kollas här
function validate(data: ProductFormData): FieldErrors {
  const errors: FieldErrors = {}

  if (!data.sku.trim()) errors.sku = 'Fyll i artikelnummer'
  if (!data.title.trim()) errors.title = 'Fyll i titel'

  if (data.price === '') {
    errors.price = 'Fyll i pris'
  } else if (!(Number(data.price) > 0)) {
    errors.price = 'Priset måste vara större än 0'
  }

  if (data.heat_level !== '') {
    const heat = Number(data.heat_level)
    if (!Number.isInteger(heat) || heat < 1 || heat > 10) {
      errors.heat_level = 'Styrkan ska vara ett heltal från 1 till 10'
    }
  }

  for (const field of integerFields) {
    const value = Number(data[field])
    if (data[field] !== '' && (!Number.isInteger(value) || value < 0)) {
      errors[field] = 'Ska vara ett heltal, 0 eller mer'
    }
  }

  for (const field of gramFields) {
    if (data[field] !== '' && !(Number(data[field]) >= 0)) {
      errors[field] = 'Kan inte vara negativt'
    }
  }

  return errors
}

// Tomma fält skickas som null, en tom sträng går inte att spara i en sifferkolumn
function toRequestBody(data: ProductFormData) {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key,
      value === '' ? null : value,
    ]),
  )
}

function AdminProductFormPage() {
  const { id } = useParams()
  const isEditMode = Boolean(id)
  const navigate = useNavigate()
  const [formData, setFormData] = useState<ProductFormData>(emptyProduct)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [error, setError] = useState('')
  const [imageError, setImageError] = useState('')
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (!id) return
    fetch(`/api/admin/products/${id}`)
      .then((res) => res.json())
      .then((data) => {
        const product = data.product
        setFormData({
          sku: product.sku ?? '',
          title: product.title,
          description: product.description ?? '',
          volume_ml: String(product.volume_ml ?? ''),
          price: product.price ?? '',
          stock: String(product.stock ?? ''),
          heat_level: String(product.heat_level ?? ''),
          image_url: product.image_url ?? '',
          ingredients: product.ingredients ?? '',
          energy_kj: String(product.energy_kj ?? ''),
          energy_kcal: String(product.energy_kcal ?? ''),
          fat_g: product.fat_g ?? '',
          saturated_fat_g: product.saturated_fat_g ?? '',
          carbohydrate_g: product.carbohydrate_g ?? '',
          sugars_g: product.sugars_g ?? '',
          protein_g: product.protein_g ?? '',
          salt_g: product.salt_g ?? '',
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
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Tömmer väljaren, så att samma fil går att välja igen efter ett fel
    event.target.value = ''
    if (!file) return
    setImageError('')
    setUploading(true)

    const body = new FormData()
    body.append('image', file)

    fetch(`/api/admin/products/${id}/image`, { method: 'POST', body })
      .then(async (res) => {
        // Vercel stoppar stora filer innan de når servern, och svarar då inte med JSON
        if (res.status === 413) {
          throw new Error('Bilden är för stor, max 4 MB')
        }
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error ?? 'Bilden kunde inte laddas upp')
        }
        setFormData((prev) => ({ ...prev, image_url: data.product.image_url }))
        if (data.searchIndexed === false) {
          setImageError(
            'Bilden är sparad, men sökindexet kunde inte uppdateras',
          )
        }
      })
      .catch((error) =>
        setImageError(
          error instanceof Error
            ? error.message
            : 'Bilden kunde inte laddas upp',
        ),
      )
      .finally(() => setUploading(false))
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    const errors = validate(formData)
    setFieldErrors(errors)
    const firstInvalid = Object.keys(errors)[0]
    if (firstInvalid) {
      const field = event.currentTarget.elements.namedItem(firstInvalid)
      if (field instanceof HTMLElement) field.focus()
      return
    }

    const url = isEditMode ? `/api/admin/products/${id}` : '/api/admin/products'
    const method = isEditMode ? 'PUT' : 'POST'

    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toRequestBody(formData)),
    })
      .then(async (res) => {
        const data = await res.json()
        if (res.status === 409) {
          setFieldErrors({ sku: data.error })
          return
        }
        if (!res.ok) {
          throw new Error(data.error ?? 'Kunde inte spara produkten')
        }
        navigate('/admin/produkter', {
          state: { searchIndexed: data.searchIndexed },
        })
      })
      .catch((error) =>
        setError(
          error instanceof Error ? error.message : 'Kunde inte spara produkten',
        ),
      )
  }

  function errorFor(name: keyof ProductFormData) {
    const message = fieldErrors[name]
    return message ? <span className="field-error">{message}</span> : null
  }

  return (
    <main className="admin-product-form-page">
      <h1>{isEditMode ? 'Redigera produkt' : 'Ny produkt'}</h1>
      <form onSubmit={handleSubmit} className="admin-product-form" noValidate>
        <label>
          Artikelnummer
          <input
            type="text"
            name="sku"
            value={formData.sku}
            onChange={handleChange}
            readOnly={isEditMode}
            aria-invalid={Boolean(fieldErrors.sku)}
          />
          {errorFor('sku')}
        </label>
        <label>
          Titel
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            aria-invalid={Boolean(fieldErrors.title)}
          />
          {errorFor('title')}
        </label>
        <label>
          Beskrivning
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
          />
        </label>
        <label>
          Volym (ml)
          <input
            type="number"
            name="volume_ml"
            value={formData.volume_ml}
            onChange={handleChange}
            aria-invalid={Boolean(fieldErrors.volume_ml)}
          />
          {errorFor('volume_ml')}
        </label>
        <label>
          Pris (kr)
          <input
            type="number"
            step="0.01"
            name="price"
            value={formData.price}
            onChange={handleChange}
            aria-invalid={Boolean(fieldErrors.price)}
          />
          {errorFor('price')}
        </label>
        <label>
          Lagersaldo (st)
          <input
            type="number"
            name="stock"
            value={formData.stock}
            onChange={handleChange}
            aria-invalid={Boolean(fieldErrors.stock)}
          />
          {errorFor('stock')}
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
            aria-invalid={Boolean(fieldErrors.heat_level)}
          />
          {errorFor('heat_level')}
        </label>
        <div className="image-upload">
          <span className="image-upload-title">Bild</span>
          {formData.image_url ? (
            <img src={formData.image_url} alt="Produktens bild" />
          ) : (
            <p className="image-upload-hint">Ingen bild än</p>
          )}
          {isEditMode ? (
            <>
              <label className="image-upload-button">
                {uploading ? 'Laddar upp...' : 'Välj bild'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={uploadImage}
                  disabled={uploading}
                />
              </label>
              <p className="image-upload-hint">
                JPEG, PNG eller WEBP, max 4 MB
              </p>
            </>
          ) : (
            <p className="image-upload-hint">
              Spara produkten först, sedan kan du ladda upp en bild.
            </p>
          )}
          {imageError && <span className="field-error">{imageError}</span>}
        </div>
        <label>
          Ingredienser
          <textarea
            name="ingredients"
            value={formData.ingredients}
            onChange={handleChange}
          />
        </label>
        <label>
          Energi (kJ)
          <input
            type="number"
            name="energy_kj"
            value={formData.energy_kj}
            onChange={handleChange}
            aria-invalid={Boolean(fieldErrors.energy_kj)}
          />
          {errorFor('energy_kj')}
        </label>
        <label>
          Energi (kcal)
          <input
            type="number"
            name="energy_kcal"
            value={formData.energy_kcal}
            onChange={handleChange}
            aria-invalid={Boolean(fieldErrors.energy_kcal)}
          />
          {errorFor('energy_kcal')}
        </label>
        <label>
          Fett (g)
          <input
            type="number"
            step="0.01"
            name="fat_g"
            value={formData.fat_g}
            onChange={handleChange}
            aria-invalid={Boolean(fieldErrors.fat_g)}
          />
          {errorFor('fat_g')}
        </label>
        <label>
          Varav mättat fett (g)
          <input
            type="number"
            step="0.01"
            name="saturated_fat_g"
            value={formData.saturated_fat_g}
            onChange={handleChange}
            aria-invalid={Boolean(fieldErrors.saturated_fat_g)}
          />
          {errorFor('saturated_fat_g')}
        </label>
        <label>
          Kolhydrat (g)
          <input
            type="number"
            step="0.01"
            name="carbohydrate_g"
            value={formData.carbohydrate_g}
            onChange={handleChange}
            aria-invalid={Boolean(fieldErrors.carbohydrate_g)}
          />
          {errorFor('carbohydrate_g')}
        </label>
        <label>
          Varav sockerarter (g)
          <input
            type="number"
            step="0.01"
            name="sugars_g"
            value={formData.sugars_g}
            onChange={handleChange}
            aria-invalid={Boolean(fieldErrors.sugars_g)}
          />
          {errorFor('sugars_g')}
        </label>
        <label>
          Protein (g)
          <input
            type="number"
            step="0.01"
            name="protein_g"
            value={formData.protein_g}
            onChange={handleChange}
            aria-invalid={Boolean(fieldErrors.protein_g)}
          />
          {errorFor('protein_g')}
        </label>
        <label>
          Salt (g)
          <input
            type="number"
            step="0.01"
            name="salt_g"
            value={formData.salt_g}
            onChange={handleChange}
            aria-invalid={Boolean(fieldErrors.salt_g)}
          />
          {errorFor('salt_g')}
        </label>
        {error && <p className="form-error">{error}</p>}
        <button type="submit">
          {isEditMode ? 'Spara ändringar' : 'Skapa produkt'}
        </button>
      </form>
    </main>
  )
}

export default AdminProductFormPage
