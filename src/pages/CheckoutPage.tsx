import { useEffect, useRef, useState, useContext, type ChangeEvent, type SubmitEvent } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from '@stripe/react-stripe-js'
import type { CartItem, ShippingMethodCode } from '../types/types'
import { formatCurrency } from '../utils/format'
import { completePostalCode } from '../utils/shipping'
import { CurrencyContext } from '../context/CurrencyContext'
import ShippingSection, { type ShippingLookup } from '../components/ShippingSection'

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

type FinishedLookup = Exclude<ShippingLookup, { status: 'idle' } | { status: 'loading' }>

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

const isAbort = (error: unknown) => error instanceof DOMException && error.name === 'AbortError'

function CheckoutPage() {
  const [formData, setFormData] = useState<CheckoutForm>(emptyForm)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const { currency } = useContext(CurrencyContext)

  const [lookup, setLookup] = useState<FinishedLookup | null>(null)
  const [retry, setRetry] = useState(0)
  // Svar per postnummer, så att samma postnummer aldrig frågas två gånger
  const lookupCache = useRef(new Map<string, FinishedLookup>())
  const [method, setMethod] = useState<ShippingMethodCode | null>(null)
  const [servicePointId, setServicePointId] = useState<string | null>(null)
  const [pointEstimates, setPointEstimates] = useState<Record<string, string | null>>({})
  const [shippingNotice, setShippingNotice] = useState<string | null>(null)
  const [shippingError, setShippingError] = useState<string | undefined>()
  const shippingHeading = useRef<HTMLHeadingElement>(null)

  // Uppslag görs bara för ett komplett postnummer, aldrig medan kunden skriver
  const postalCode = completePostalCode(formData.shipping_postal_code)

  // Ett svar som hör till ett annat postnummer än det i fältet används aldrig
  const active: ShippingLookup = !postalCode
    ? { status: 'idle' }
    : lookup && lookup.postalCode === postalCode
      ? lookup
      : { status: 'loading', postalCode }
  const quote = active.status === 'ready' ? active.quote : null
  const selectedOption = quote?.options.find((option) => option.code === method) ?? null
  const selectedPoint = quote?.servicePoints.find((point) => point.id === servicePointId) ?? null
  const estimateKey = postalCode && selectedPoint ? `${postalCode}:${selectedPoint.id}` : null

  useEffect(() => {
    fetch('/api/cart')
      .then((res) => res.json())
      .then((data) => setCartItems(data.cart_items))
      .catch((error) => console.error('Kunde inte hämta varukorgen', error))
  }, [])

  useEffect(() => {
    if (!postalCode) return
    const cached = lookupCache.current.get(postalCode)
    if (cached) {
      setLookup(cached)
      return
    }

    // Ändras postnumret medan svaret väntas avbryts anropet, så att ett sent svar inte skriver över ett nyare
    const controller = new AbortController()
    fetch(`/api/shipping/options?postalCode=${postalCode}`, { signal: controller.signal })
      .then(async (res) => {
        const data = await res.json()
        let next: FinishedLookup
        if (res.ok) {
          next = { status: 'ready', postalCode, quote: data }
        } else if (data.field === 'shipping_postal_code') {
          next = { status: 'invalidPostalCode', postalCode, message: data.error }
        } else {
          next = { status: 'failed', postalCode }
        }
        // Misslyckade uppslag sparas inte, så att Försök igen frågar på nytt
        if (next.status !== 'failed') lookupCache.current.set(postalCode, next)
        setLookup(next)
      })
      .catch((error) => {
        if (!isAbort(error)) setLookup({ status: 'failed', postalCode })
      })
    return () => controller.abort()
  }, [postalCode, retry])

  // Leveranstiden till valt ombud hämtas en gång per ombud och postnummer
  useEffect(() => {
    if (!estimateKey || estimateKey in pointEstimates) return
    const [code, id] = estimateKey.split(':')
    const controller = new AbortController()
    fetch(`/api/shipping/estimate?postalCode=${code}&servicePointId=${id}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : { estimatedDelivery: null }))
      .then((data) => setPointEstimates((prev) => ({ ...prev, [estimateKey]: data.estimatedDelivery ?? null })))
      .catch((error) => {
        if (!isAbort(error)) setPointEstimates((prev) => ({ ...prev, [estimateKey]: null }))
      })
    return () => controller.abort()
  }, [estimateKey, pointEstimates])

  const itemsTotal = cartItems.reduce((summa, item) => summa + Number(item.price) * item.quantity, 0)
  // Det som visas här är bara en förhandsvisning. Servern räknar om allt innan betalningen.
  const total = itemsTotal + (selectedOption?.price ?? 0)
  const moms = formatCurrency((total * 0.12) / 1.12)

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target
    // Ett valt ombud gäller bara postnumret det valdes för. Ändras postnumret får kunden välja igen.
    if (name === 'shipping_postal_code' && servicePointId && completePostalCode(value) !== postalCode) {
      setServicePointId(null)
      setShippingNotice('Du har ändrat postnumret. Välj ombud eller paketbox igen.')
    }
    setFormData((prev) => ({ ...prev, [name]: value }))
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  function handleMethodChange(next: ShippingMethodCode) {
    setMethod(next)
    setShippingError(undefined)
  }

  function handleServicePointChange(id: string) {
    setServicePointId(id)
    setShippingNotice(null)
    setShippingError(undefined)
  }

  function retryLookup() {
    setLookup(null)
    setRetry((count) => count + 1)
  }

  function shippingProblem() {
    if (!postalCode || active.status === 'invalidPostalCode') return undefined
    if (active.status === 'loading') return 'Vänta tills fraktalternativen har hämtats.'
    if (active.status === 'failed') return 'Fraktalternativen kunde inte hämtas. Försök igen.'
    if (quote && quote.options.length === 0) return 'Vi kan tyvärr inte leverera till ditt postnummer.'
    if (!selectedOption) return 'Välj fraktsätt.'
    if (selectedOption.code === 'ombud' && quote?.servicePointStatus === 'found' && !selectedPoint) {
      return 'Välj ett ombud eller en paketbox.'
    }
    return undefined
  }

  // Servern sparar ordern som obetald och svarar med en nyckel till Stripes formulär
  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    const errors = validate(formData)
    if (active.status === 'invalidPostalCode') errors.shipping_postal_code = active.message
    const problem = shippingProblem()
    setFieldErrors(errors)
    setShippingError(problem)

    const firstInvalid = Object.keys(errors)[0]
    if (firstInvalid) {
      const field = event.currentTarget.elements.namedItem(firstInvalid)
      if (field instanceof HTMLElement) field.focus()
      return
    }
    if (problem || !selectedOption) {
      shippingHeading.current?.focus()
      return
    }

    setSending(true)
    fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // Kassan skickar fraktsätt och ombud, aldrig något pris
      body: JSON.stringify({
        ...formData,
        customer_email: formData.customer_email.trim(),
        shipping_method: selectedOption.code,
        ...(selectedOption.code === 'ombud' && selectedPoint ? { service_point_id: selectedPoint.id } : {}),
      }),
    })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) {
          if (data.field === 'shipping_postal_code') {
            setFieldErrors((prev) => ({ ...prev, shipping_postal_code: data.error }))
          } else if (data.field === 'shipping_method' || data.field === 'service_point_id') {
            // Ombuden kan ha ändrats sedan uppslaget, så postnumret frågas på nytt
            if (postalCode) lookupCache.current.delete(postalCode)
            setServicePointId(null)
            setShippingError(data.error)
            retryLookup()
          } else {
            setError(data.error ?? 'Något gick fel. Försök igen.')
          }
          return
        }
        setClientSecret(data.clientSecret)
      })
      .catch(() => setError('Kunde inte nå butiken. Kontrollera anslutningen och försök igen.'))
      .finally(() => setSending(false))
  }

  function errorFor(name: keyof CheckoutForm) {
    const message = fieldErrors[name] ?? (name === 'shipping_postal_code' && active.status === 'invalidPostalCode' ? active.message : undefined)
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
                aria-invalid={Boolean(fieldErrors.shipping_postal_code) || active.status === 'invalidPostalCode'}
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
          <ShippingSection
            lookup={active}
            method={method}
            onMethodChange={handleMethodChange}
            servicePointId={servicePointId}
            onServicePointChange={handleServicePointChange}
            servicePointEstimate={estimateKey ? pointEstimates[estimateKey] : undefined}
            notice={shippingNotice}
            error={shippingError}
            onRetry={retryLookup}
            headingRef={shippingHeading}
          />
          <button type="submit" className="checkout-submit" disabled={sending}>
            Gå till betalning
          </button>
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
            {selectedOption && (
              <li>
                <span>Frakt, {selectedOption.name}</span>
                <span>{selectedOption.price === 0 ? 'Fri frakt' : formatCurrency(selectedOption.price)}</span>
              </li>
            )}
          </ul>
          <p className="summary-total">
            <span>Att betala </span>
            <strong>{formatCurrency(total)}</strong>
          </p>
          <p className="summary-vat">varav moms {moms}</p>
          {currency !== 'SEK' && <p className="summary-note">Du betalar i svenska kronor.</p>}
        </section>
      </div>
    </main>
  )
}

export default CheckoutPage
