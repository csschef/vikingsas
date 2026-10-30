// Koderna i tabellen shipping_methods. Ombud gäller även paketboxar.
export type ShippingMethodCode = 'ombud' | 'hem'

// En rad ur shipping_methods. pg ger NUMERIC som text.
export type ShippingMethodRow = {
  code: ShippingMethodCode
  name: string
  price: string
  free_from: string | null
}

export type ShippingOption = {
  code: ShippingMethodCode
  name: string
  // Det kunden betalar, 0 när frakten är fri
  price: number
  regularPrice: number
  freeFrom: number | null
  // Det som fattas till fri frakt, null när frakten redan är fri eller gränsen saknas
  amountToFreeShipping: number | null
}

// Räknar i hela ören, så att jämförelsen med gränsen inte påverkas av avrundning i decimaltal
function toOre(kronor: number) {
  return Math.round(kronor * 100)
}

// Priset räknas alltid här på servern, utifrån tabellen och varukorgens summa. Fri frakt gäller från och med gränsen.
export function calculateShipping(method: ShippingMethodRow, cartTotal: number): ShippingOption {
  const regular = toOre(Number(method.price))
  const freeFrom = method.free_from === null ? null : toOre(Number(method.free_from))
  const total = toOre(cartTotal)
  const isFree = freeFrom !== null && total >= freeFrom

  return {
    code: method.code,
    name: method.name,
    price: isFree ? 0 : regular / 100,
    regularPrice: regular / 100,
    freeFrom: freeFrom === null ? null : freeFrom / 100,
    amountToFreeShipping: freeFrom === null || isFree ? null : (freeFrom - total) / 100,
  }
}
