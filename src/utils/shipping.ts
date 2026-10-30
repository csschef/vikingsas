import type { OrderShipping, ServicePoint } from '../types/types'

const DAY_NAMES = ['mån', 'tis', 'ons', 'tors', 'fre', 'lör', 'sön']

// "123 45" och "12345" blir "12345". Allt annat blir null, och då görs inget uppslag.
export function completePostalCode(value: string) {
  const trimmed = value.trim()
  return /^\d{3} ?\d{2}$/.test(trimmed) ? trimmed.replace(' ', '') : null
}

// "2026-11-02" blir "måndag 2/11". Räknas i UTC så att datumet inte flyttas av tidszonen.
export function formatDeliveryDate(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  const weekday = new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('sv-SE', { weekday: 'long', timeZone: 'UTC' })
  return `${weekday} ${day}/${month}`
}

export function formatDistance(meters: number | null) {
  if (meters === null) return null
  if (meters < 1000) return `${meters} m`
  return `${(meters / 1000).toLocaleString('sv-SE', { maximumFractionDigits: 1 })} km`
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

const time = (value: string) => value.replace(':', '.')

// Dagar i rad med samma tider slås ihop, till exempel "Mån-fre 07.00-22.00"
export function formatOpeningHours(hours: ServicePoint['openingHours']) {
  const sorted = [...hours].sort((a, b) => a.day - b.day)
  if (sorted.length === 7 && sorted.every((row) => row.opens === '00:00' && row.closes === '23:59')) {
    return ['Dygnet runt']
  }

  const groups: { from: number; to: number; opens: string; closes: string }[] = []
  for (const row of sorted) {
    const last = groups.at(-1)
    if (last && last.to === row.day - 1 && last.opens === row.opens && last.closes === row.closes) {
      last.to = row.day
    } else {
      groups.push({ from: row.day, to: row.day, opens: row.opens, closes: row.closes })
    }
  }

  return groups.map((group) => {
    const days =
      group.from === 1 && group.to === 7
        ? 'Alla dagar'
        : capitalize(group.from === group.to ? DAY_NAMES[group.from - 1] : `${DAY_NAMES[group.from - 1]}-${DAY_NAMES[group.to - 1]}`)
    return `${days} ${time(group.opens)}-${time(group.closes)}`
  })
}

// "39365" blir "393 65"
export function formatPostalCode(postalCode: string) {
  return /^\d{5}$/.test(postalCode) ? `${postalCode.slice(0, 3)} ${postalCode.slice(3)}` : postalCode
}

// "Ica Supermarket Lindsdal, Kanngjutarvägen 5, 393 65 Kalmar"
export function servicePointAddress(order: OrderShipping) {
  const place = [order.service_point_postal_code && formatPostalCode(order.service_point_postal_code), order.service_point_city]
  return [order.service_point_name, order.service_point_street, place.filter(Boolean).join(' ')].filter(Boolean).join(', ')
}

export function mapUrl(coordinates: NonNullable<ServicePoint['coordinates']>) {
  const { latitude, longitude } = coordinates
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`
}
