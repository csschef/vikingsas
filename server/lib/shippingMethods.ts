import { pool } from '../db.js'
import { calculateShipping, type ShippingMethodRow } from './shippingPrice.js'

export async function getShippingMethods() {
  const result = await pool.query<ShippingMethodRow>('SELECT code, name, price, free_from FROM shipping_methods ORDER BY price')
  return result.rows
}

// Alla fraktalternativ med det pris som gäller för varukorgens summa just nu
export async function getShippingOptions(cartTotal: number) {
  const methods = await getShippingMethods()
  return methods.map((method) => calculateShipping(method, cartTotal))
}
