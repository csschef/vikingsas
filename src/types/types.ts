export type Product = {
  id: number
  title: string
  description: string
  volume_ml: number
  price: string
  heat_level: number
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

export type CartItem = {
  id: number
  product_id: number
  quantity: number
  title: string
  price: string
  image_url: string
}
