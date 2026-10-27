import { useEffect, useState, useContext, type ChangeEvent, type SubmitEvent } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from '@stripe/react-stripe-js'
import type { CartItem } from '../types/types'
import { formatCurrency } from '../utils/format'
import { CurrencyContext } from '../context/CurrencyContext'

// Laddas en gång, utanför komponenten. Den publika nyckeln kan bara visa formuläret, inte skapa betalningar.
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

type CheckoutForm = {
  customer_name: string
  customer_email: string
  customer_phone: string
  shipping_street: string
  shipping_postal_code: string
  shipping_city: string
}

type FieldErrors = Partial<Record<keyof CheckoutForm, string>>

const emptyForm: CheckoutForm = {
  customer_name: '',
  customer_email: '',
  customer_phone: '',
  shipping_street: '',
  shipping_postal_code: '',
  shipping_city: '',
}

// Formuläret har noValidate, så det webbläsaren kollade förut kollas här. Servern kollar samma sak igen.
function validate(data: CheckoutForm): FieldErrors {
  const errors: FieldErrors = {}
  const email = data.customer_email.trim()
  const phone = data.customer_phone.trim()
  const postalCode = data.shipping_postal_code.trim()

  if (!data.customer_name.trim()) errors.customer_name = 'Fyll i namn'

  if (!email) {
    errors.customer_email = 'Fyll i e-post'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.customer_email = 'E-postadressen ser inte rätt ut'
  }

  if (!phone) {
    errors.customer_phone = 'Fyll i telefonnummer'
  } else if (!/^[0-9 +-]{7,20}$/.test(phone)) {
    errors.customer_phone = 'Telefonnumret ser inte rätt ut'
  }

  if (!data.shipping_street.trim()) errors.shipping_street = 'Fyll i gatuadress'

  if (!postalCode) {
    errors.shipping_postal_code = 'Fyll i postnummer'
  } else if (!/^\d{3} ?\d{2}$/.test(postalCode)) {
    errors.shipping_postal_code = 'Fem siffror, till exempel 123 45'
  }

  if (!data.shipping_city.trim()) errors.shipping_city = 'Fyll i ort'

  return errors
}

function CheckoutPage() {
  const [formData, setFormData] = useState<CheckoutForm>(emptyForm)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const { currency } = useContext(CurrencyContext)

  useEffect(() => {
    fetch('/api/cart')
      .then((res) => res.json())
      .then((data) => setCartItems(data.cart_items))
      .catch((error) => console.error('Kunde inte hämta varukorgen', error))
  }, [])

  const total = cartItems.reduce(
    (summa, item) => summa + Number(item.price) * item.quantity,
    0,
  )

  const moms = formatCurrency((total * 0.12) / 1.12)

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  // Servern sparar ordern som obetald och svarar med en nyckel till Stripes formulär
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

    setSending(true)
    fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...formData,
        customer_email: formData.customer_email.trim(),
      }),
    })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) {
          setError(data.error ?? 'Något gick fel. Försök igen.')
          return
        }
        setClientSecret(data.clientSecret)
      })
      .catch(() => setError('Kunde inte nå butiken. Kontrollera anslutningen och försök igen.'))
      .finally(() => setSending(false))
  }

  function errorFor(name: keyof CheckoutForm) {
    const message = fieldErrors[name]
    return message ? <span className="field-error">{message}</span> : null
  }

  if (clientSecret) {
    return (
      <main className="checkout-page">
        <h1>Kassa</h1>
        <div className="stripe-checkout">
          <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      </main>
    )
  }

  return (
    <main className="checkout-page">
      <h1>Kassa</h1>
      <div className="checkout-layout">
        <form onSubmit={handleSubmit} noValidate>
          <label>
            Namn:
            <input
              type="text"
              name="customer_name"
              autoComplete="name"
              value={formData.customer_name}
              onChange={handleChange}
              aria-invalid={Boolean(fieldErrors.customer_name)}
            />
            {errorFor('customer_name')}
          </label>
          <label>
            E-post:
            <input
              type="email"
              name="customer_email"
              autoComplete="email"
              value={formData.customer_email}
              onChange={handleChange}
              aria-invalid={Boolean(fieldErrors.customer_email)}
            />
            {errorFor('customer_email')}
          </label>
          <label>
            Telefon:
            <input
              type="tel"
              name="customer_phone"
              autoComplete="tel"
              value={formData.customer_phone}
              onChange={handleChange}
              aria-invalid={Boolean(fieldErrors.customer_phone)}
            />
            {errorFor('customer_phone')}
          </label>
          <label>
            Gatuadress:
            <input
              type="text"
              name="shipping_street"
              autoComplete="street-address"
              value={formData.shipping_street}
              onChange={handleChange}
              aria-invalid={Boolean(fieldErrors.shipping_street)}
            />
            {errorFor('shipping_street')}
          </label>
          <div className="checkout-form-row">
            <label>
              Postnummer:
              <input
                type="text"
                name="shipping_postal_code"
                autoComplete="postal-code"
                inputMode="numeric"
                value={formData.shipping_postal_code}
                onChange={handleChange}
                aria-invalid={Boolean(fieldErrors.shipping_postal_code)}
              />
              {errorFor('shipping_postal_code')}
            </label>
            <label>
              Ort:
              <input
                type="text"
                name="shipping_city"
                autoComplete="address-level2"
                value={formData.shipping_city}
                onChange={handleChange}
                aria-invalid={Boolean(fieldErrors.shipping_city)}
              />
              {errorFor('shipping_city')}
            </label>
          </div>
          <button type="submit" disabled={sending}>Gå till betalning</button>
          {error && <p className="form-error">{error}</p>}
        </form>
        <section className="order-summary">
          <h2>Din order</h2>
          <ul>
            {cartItems.map((item) => (
              <li key={item.id}>
                <span>
                  {item.title} x {item.quantity}
                </span>
                <span>{formatCurrency(Number(item.price) * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <p className="summary-total">
            <span>Att betala </span>
            <strong>{formatCurrency(total)}</strong>
          </p>
          <p className="summary-vat">varav moms {moms}</p>
          {currency !== 'SEK' && (
            <p className="summary-note">Du betalar i svenska kronor.</p>
          )}
        </section>
      </div>
    </main>
  )
}

export default CheckoutPage
