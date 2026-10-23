export type Product = {
  id: number
  sku: string | null
  ean: string | null
  category: string | null
  stock: number | null
  variants: string[]
  is_featured: boolean
  title: string
  description: string
  volume_ml: number | null
  price: string
  heat_level: number | null
  image_url: string
  ingredients: string
  energy_kj: number
  energy_kcal: number
  fat_g: string
  saturated_fat_g: string
  carbohydrate_g: string
  sugars_g: string
  protein_g: string
  salt_g: string
  is_active: boolean
}

// Det /api/search svarar med. Priset är ett tal här, inte text som från databasen.
export type SearchProduct = {
  id: number
  sku: string
  title: string
  description: string | null
  category: string | null
  price: number
  heat_level: number | null
  image_url: string | null
  stock: number | null
}

export type SearchResult = {
  products: SearchProduct[]
  meta: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export type CartItem = {
  id: number
  product_id: number
  quantity: number
  title: string
  price: string
  image_url: string
}

export type Order = {
  id: number
  customer_name: string
  customer_email: string
  total_amount: string
  created_at: string
  items: OrderItem[]
  status: 'Beställd' | 'Behandlas' | 'Levererad' | 'Återbetald'
}

export type OrderItem = {
  product_id: number
  product_title: string
  quantity: number
  unit_price: number
}
