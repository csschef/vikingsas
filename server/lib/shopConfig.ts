// Varifrån paketen skickas. 393 65 om inget annat anges.
export function shopPostalCode() {
  return process.env.SHOP_POSTAL_CODE ?? '39365'
}
