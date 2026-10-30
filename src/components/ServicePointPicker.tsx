import type { ServicePoint } from '../types/types'
import { formatDistance } from '../utils/shipping'

type ServicePointPickerProps = {
  servicePoints: ServicePoint[]
  unavailableKinds: ServicePoint['kind'][]
  selectedId: string | null
  onSelect: (id: string) => void
}

const groups: { kind: ServicePoint['kind']; title: string; missing: string }[] = [
  { kind: 'servicePoint', title: 'Ombud', missing: 'Ombud kan inte visas just nu.' },
  { kind: 'parcelBox', title: 'Paketboxar', missing: 'Paketboxar kan inte visas just nu.' },
]

// Ombud och paketboxar i var sin grupp, som PostNord rekommenderar
function ServicePointPicker({ servicePoints, unavailableKinds, selectedId, onSelect }: ServicePointPickerProps) {
  return (
    <div className="service-point-picker">
      {groups.map((group) => {
        if (unavailableKinds.includes(group.kind)) {
          return (
            <p key={group.kind} className="shipping-notice">
              {group.missing}
            </p>
          )
        }
        const points = servicePoints.filter((point) => point.kind === group.kind)
        if (points.length === 0) return null

        return (
          <fieldset key={group.kind} className="service-point-group">
            <legend>{group.title}</legend>
            <div role="radiogroup" aria-label={group.title} className="service-point-list">
              {points.map((point) => {
                const distance = formatDistance(point.distanceMeters)
                return (
                  <button
                    key={point.id}
                    type="button"
                    role="radio"
                    aria-checked={point.id === selectedId}
                    className="service-point"
                    onClick={() => onSelect(point.id)}
                  >
                    <span className="service-point-name">{point.name}</span>
                    {distance && <span className="service-point-distance">{distance}</span>}
                    <span className="service-point-address">
                      {point.street}, {point.city}
                    </span>
                  </button>
                )
              })}
            </div>
          </fieldset>
        )
      })}
    </div>
  )
}

export default ServicePointPicker
