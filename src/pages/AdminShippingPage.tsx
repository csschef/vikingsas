import { useEffect, useState, type ChangeEvent, type SubmitEvent } from 'react'
import type { ShippingMethodCode } from '../types/types'

// En rad ur shipping_methods. pg ger NUMERIC som text.
type ShippingMethod = {
  code: ShippingMethodCode
  name: string
  price: string
  free_from: string | null
}

type Draft = { name: string; price: string; free_from: string }
type DraftErrors = Partial<Record<keyof Draft, string>>

const headings: Record<ShippingMethodCode, string> = {
  ombud: 'Ombud och paketbox',
  hem: 'Hemleverans',
}

// "49,90" och "49.90" blir 49.9. Tom text blir null.
function toNumber(text: string) {
  const trimmed = text.trim().replace(',', '.')
  if (!trimmed) return null
  return /^\d+(\.\d{1,2})?$/.test(trimmed) ? Number(trimmed) : Number.NaN
}

function toDraft(method: ShippingMethod): Draft {
  const show = (value: string) => Number(value).toString().replace('.', ',')
  return { name: method.name, price: show(method.price), free_from: method.free_from === null ? '' : show(method.free_from) }
}

// Samma regler som servern, så att felen syns direkt under fälten. Servern kontrollerar igen.
function validate(draft: Draft): DraftErrors {
  const errors: DraftErrors = {}
  const price = toNumber(draft.price)
  const freeFrom = toNumber(draft.free_from)

  if (!draft.name.trim()) errors.name = 'Fyll i ett namn'
  else if (draft.name.trim().length > 50) errors.name = 'Högst 50 tecken'

  if (price === null) errors.price = 'Fyll i ett pris'
  else if (Number.isNaN(price)) errors.price = 'Ett belopp i kronor, högst två decimaler'

  if (freeFrom !== null && Number.isNaN(freeFrom)) errors.free_from = 'Ett belopp i kronor, högst två decimaler'
  else if (freeFrom === 0) errors.free_from = 'Gränsen måste vara större än 0'

  return errors
}

function AdminShippingPage() {
  const [methods, setMethods] = useState<ShippingMethod[]>([])
  const [drafts, setDrafts] = useState<Partial<Record<ShippingMethodCode, Draft>>>({})
  const [errors, setErrors] = useState<Partial<Record<ShippingMethodCode, DraftErrors>>>({})
  const [messages, setMessages] = useState<Partial<Record<ShippingMethodCode, string>>>({})
  const [saving, setSaving] = useState<ShippingMethodCode | null>(null)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    fetch('/api/admin/shipping')
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setMethods(data.methods)
        setDrafts(Object.fromEntries(data.methods.map((method: ShippingMethod) => [method.code, toDraft(method)])))
      })
      .catch(() => setLoadError('Fraktsätten kunde inte hämtas.'))
  }, [])

  function handleChange(code: ShippingMethodCode, event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target
    setDrafts((prev) => ({ ...prev, [code]: { ...prev[code], [name]: value } as Draft }))
    setErrors((prev) => ({ ...prev, [code]: { ...prev[code], [name]: undefined } }))
    setMessages((prev) => ({ ...prev, [code]: undefined }))
  }

  function handleSubmit(code: ShippingMethodCode, event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const draft = drafts[code]
    if (!draft) return

    const found = validate(draft)
    setErrors((prev) => ({ ...prev, [code]: found }))
    const firstInvalid = Object.keys(found)[0]
    if (firstInvalid) {
      const field = event.currentTarget.elements.namedItem(firstInvalid)
      if (field instanceof HTMLElement) field.focus()
      return
    }

    setSaving(code)
    fetch(`/api/admin/shipping/${code}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: draft.name.trim(), price: toNumber(draft.price), free_from: toNumber(draft.free_from) }),
    })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) {
          setErrors((prev) => ({ ...prev, [code]: data.errors ?? {} }))
          setMessages((prev) => ({ ...prev, [code]: data.error ?? 'Något gick fel. Försök igen.' }))
          return
        }
        setMethods((prev) => prev.map((method) => (method.code === code ? data.method : method)))
        setDrafts((prev) => ({ ...prev, [code]: toDraft(data.method) }))
        setMessages((prev) => ({ ...prev, [code]: 'Sparat' }))
      })
      .catch(() => setMessages((prev) => ({ ...prev, [code]: 'Kunde inte nå servern. Försök igen.' })))
      .finally(() => setSaving(null))
  }

  return (
    <main className="admin-shipping-page">
      <div className="admin-page-header">
        <h1>Frakt</h1>
      </div>
      <p className="admin-shipping-intro">
        Ändringar gäller nya ordrar. Gamla ordrar behåller fraktpriset de fick. Lämna fri frakt tomt om fraktsättet aldrig ska vara gratis.
      </p>
      {loadError && <p className="form-error">{loadError}</p>}

      {methods.map((method) => {
        const draft = drafts[method.code]
        if (!draft) return null
        const fieldErrors = errors[method.code] ?? {}
        const errorFor = (name: keyof Draft) =>
          fieldErrors[name] ? <span className="field-error">{fieldErrors[name]}</span> : null

        return (
          <section key={method.code} className="admin-order-card admin-shipping-method">
            <h2>{headings[method.code]}</h2>
            <form className="admin-product-form" noValidate onSubmit={(event) => handleSubmit(method.code, event)}>
              <label>
                Namn som kunden ser
                <input name="name" value={draft.name} onChange={(event) => handleChange(method.code, event)} aria-invalid={Boolean(fieldErrors.name)} />
                {errorFor('name')}
              </label>
              <label>
                Pris (kr)
                <input name="price" inputMode="decimal" value={draft.price} onChange={(event) => handleChange(method.code, event)} aria-invalid={Boolean(fieldErrors.price)} />
                {errorFor('price')}
              </label>
              <label>
                Fri frakt från (kr)
                <input name="free_from" inputMode="decimal" value={draft.free_from} onChange={(event) => handleChange(method.code, event)} aria-invalid={Boolean(fieldErrors.free_from)} />
                {errorFor('free_from')}
              </label>
              <button type="submit" disabled={saving === method.code}>
                {saving === method.code ? 'Sparar...' : 'Spara'}
              </button>
              <p className="admin-shipping-message" aria-live="polite">
                {messages[method.code]}
              </p>
            </form>
          </section>
        )
      })}
    </main>
  )
}

export default AdminShippingPage
