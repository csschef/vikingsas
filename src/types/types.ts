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

// Det /api/shipping/options svarar med
export type ShippingMethodCode = 'ombud' | 'hem'

export type ShippingOption = {
  code: ShippingMethodCode
  name: string
  price: number
  regularPrice: number
  freeFrom: number | null
  amountToFreeShipping: number | null
  estimatedDelivery: string | null
}

export type ServicePoint = {
  id: string
  kind: 'servicePoint' | 'parcelBox'
  name: string
  street: string
  postalCode: string
  city: string
  countryCode: string
  distanceMeters: number | null
  coordinates: { latitude: number; longitude: number } | null
  openingHours: { day: number; opens: string; closes: string }[]
  pickupRequirements: string[]
}

export type ShippingQuote = {
  options: ShippingOption[]
  servicePoints: ServicePoint[]
  servicePointStatus: 'found' | 'none' | 'manual' | 'unverified'
  unavailableKinds: ServicePoint['kind'][]
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
  customer_phone: string | null
  shipping_street: string | null
  shipping_postal_code: string | null
  shipping_city: string | null
  total_amount: string
  created_at: string
  items: OrderItem[]
  status: 'Beställd' | 'Behandlas' | 'Levererad' | 'Återbetald'
  payment_status: 'Obetald' | 'Betald' | 'Avbruten'
} & OrderShipping

// Frakten som den sparades på ordern. Tom på ordrar från innan frakten fanns.
export type OrderShipping = {
  shipping_method?: ShippingMethodCode | null
  shipping_method_name?: string | null
  shipping_price?: string | null
  service_point_status?: 'Vald' | 'Väntar' | null
  service_point_id?: string | null
  service_point_country_code?: string | null
  service_point_name?: string | null
  service_point_street?: string | null
  service_point_postal_code?: string | null
  service_point_city?: string | null
}

export type OrderItem = {
  product_id: number
  product_title: string
  quantity: number
  unit_price: number
}
