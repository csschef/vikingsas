import type { RefObject } from 'react'
import type { ShippingMethodCode, ShippingOption, ShippingQuote } from '../types/types'
import { formatCurrency } from '../utils/format'
import { formatDeliveryDate, formatOpeningHours, mapUrl } from '../utils/shipping'
import ServicePointPicker from './ServicePointPicker'

// Uppslaget för postnumret som står i fältet just nu
export type ShippingLookup =
  | { status: 'idle' }
  | { status: 'loading'; postalCode: string }
  | { status: 'ready'; postalCode: string; quote: ShippingQuote }
  | { status: 'invalidPostalCode'; postalCode: string; message: string }
  | { status: 'failed'; postalCode: string }

type ShippingSectionProps = {
  lookup: ShippingLookup
  method: ShippingMethodCode | null
  onMethodChange: (method: ShippingMethodCode) => void
  servicePointId: string | null
  onServicePointChange: (id: string) => void
  // undefined medan leveranstiden till valt ombud hämtas
  servicePointEstimate: string | null | undefined
  notice: string | null
  error: string | undefined
  onRetry: () => void
  // Kassan flyttar fokus hit när fraktvalet saknas
  headingRef: RefObject<HTMLHeadingElement | null>
}

// Leveranstiden visas alltid som en uppskattning
function deliveryText(date: string | null) {
  return date ? `Beräknad leverans: ${formatDeliveryDate(date)}` : 'Beräknad leveranstid är tillfälligt otillgänglig.'
}

function priceText(option: ShippingOption) {
  return option.price === 0 ? 'Fri frakt' : formatCurrency(option.price)
}

function ShippingSection(props: ShippingSectionProps) {
  const { lookup, method, servicePointId, servicePointEstimate } = props
  const quote = lookup.status === 'ready' ? lookup.quote : null
  const selectedPoint = quote?.servicePoints.find((point) => point.id === servicePointId) ?? null

  function estimateFor(option: ShippingOption) {
    if (option.code === 'ombud' && selectedPoint && servicePointEstimate !== undefined) return servicePointEstimate
    return option.estimatedDelivery
  }

  return (
    <section className="shipping-section" aria-labelledby="shipping-heading">
      <h2 id="shipping-heading" tabIndex={-1} ref={props.headingRef}>
        Frakt
      </h2>
      <p className="shipping-hint">Vi skickar bara inom Sverige.</p>
      {props.notice && <p className="shipping-notice">{props.notice}</p>}

      {lookup.status === 'idle' && <p className="shipping-hint">Fyll i ditt postnummer så visas fraktalternativen.</p>}
      {lookup.status === 'loading' && <p className="shipping-hint">Hämtar fraktalternativ...</p>}
      {lookup.status === 'invalidPostalCode' && <p className="shipping-hint">Rätta postnumret så visas fraktalternativen.</p>}
      {lookup.status === 'failed' && (
        <p className="shipping-hint">
          Fraktalternativen kunde inte hämtas.{' '}
          <button type="button" className="text-button" onClick={props.onRetry}>
            Försök igen
          </button>
        </p>
      )}

      {quote && quote.options.length === 0 && (
        <p className="shipping-notice">Vi kan tyvärr inte leverera till ditt postnummer.</p>
      )}

      {quote && quote.options.length > 0 && (
        <div role="radiogroup" aria-label="Fraktsätt" className="shipping-options">
          {quote.options.map((option) => (
            <button
              key={option.code}
              type="button"
              role="radio"
              aria-checked={option.code === method}
              className="shipping-option"
              onClick={() => props.onMethodChange(option.code)}
            >
              <span className="shipping-option-name">{option.name}</span>
              <span className="shipping-option-price">{priceText(option)}</span>
              <span className="shipping-option-delivery">{deliveryText(estimateFor(option))}</span>
              {option.amountToFreeShipping !== null && (
                <span className="shipping-option-upsell">
                  Handla för {formatCurrency(option.amountToFreeShipping)} till för fri frakt.
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {quote && method === 'ombud' && quote.servicePointStatus === 'found' && (
        <>
          <ServicePointPicker
            servicePoints={quote.servicePoints}
            unavailableKinds={quote.unavailableKinds}
            selectedId={servicePointId}
            onSelect={props.onServicePointChange}
          />
          {selectedPoint && (
            <div className="service-point-details">
              <p className="service-point-name">{selectedPoint.name}</p>
              {selectedPoint.pickupRequirements.length > 0 && (
                <p className="shipping-hint">Hämtas med {selectedPoint.pickupRequirements.join(' eller ')}.</p>
              )}
              {selectedPoint.openingHours.length > 0 && (
                <ul className="opening-hours">
                  {formatOpeningHours(selectedPoint.openingHours).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              )}
              {selectedPoint.coordinates && (
                <a href={mapUrl(selectedPoint.coordinates)} target="_blank" rel="noopener noreferrer">
                  Visa på karta
                </a>
              )}
            </div>
          )}
        </>
      )}

      {quote && method === 'ombud' && quote.servicePointStatus === 'manual' && (
        <p className="shipping-notice">
          Vi kan inte visa ombud just nu. Vi väljer ett ombud nära din adress åt dig efter beställningen.
        </p>
      )}

      {quote && method === 'ombud' && quote.servicePointStatus === 'unverified' && (
        <p className="shipping-notice">
          Leveransalternativet kunde inte kontrolleras just nu. Vi väljer ett ombud nära din adress åt dig efter beställningen.
        </p>
      )}

      {props.error && <span className="field-error">{props.error}</span>}
    </section>
  )
}

export default ShippingSection
