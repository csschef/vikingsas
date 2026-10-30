import { postnord } from './postnordAdapter.js'

// Det butiken behöver av ett transportbolag. Ett nytt bolag får en egen adapter som följer ShippingCarrier.

export type OpeningHours = {
  // 1 är måndag och 7 är söndag
  day: number
  opens: string
  closes: string
}

export type ServicePoint = {
  id: string
  // Bemannat ombud eller paketbox, kassan visar dem i var sin grupp
  kind: 'servicePoint' | 'parcelBox'
  name: string
  street: string
  postalCode: string
  city: string
  // ISO 3166-1, t.ex. "SE". Bolagets id är bara unikt tillsammans med landskoden.
  countryCode: string
  // I meter från kundens postnummer, null om bolaget inte skickar med avståndet
  distanceMeters: number | null
  coordinates: { latitude: number; longitude: number } | null
  openingHours: OpeningHours[]
  // Det som krävs för att hämta paketet, t.ex. "BankID" för en paketbox
  pickupRequirements: string[]
}

// invalidPostalCode bara när bolaget uttryckligen säger att postnumret inte finns, aldrig för en tom lista
export type ServicePointsResult =
  // unavailableKinds är grupper som inte gick att hämta, de som hittades visas ändå
  | { status: 'found'; servicePoints: ServicePoint[]; unavailableKinds: ServicePoint['kind'][] }
  | { status: 'noServicePoints'; reason: string }
  | { status: 'invalidPostalCode'; reason: string }
  | { status: 'rejected'; reason: string }
  | { status: 'unavailable'; reason: string }
  | { status: 'invalidResponse'; reason: string }

export type DeliveryRequest = {
  fromPostalCode: string
  toPostalCode: string
  // Svensk lokal tid när paketet lämnas till bolaget, från nextHandoverTime
  handoverTime: string
  delivery: 'home' | 'servicePoint'
  // Valt ombud eller paketbox. Saknas det räknas leveransen till postnumret.
  servicePointId?: string
}

export type DeliveryEstimateResult =
  // date är YYYY-MM-DD, kassan visar det som en uppskattning, t.ex. "tisdag 3/11"
  | { status: 'estimate'; date: string }
  | { status: 'notSupported'; reason: string }
  | { status: 'invalidServicePoint'; reason: string }
  | { status: 'invalidPostalCode'; reason: string }
  | { status: 'rejected'; reason: string }
  | { status: 'unavailable'; reason: string }
  | { status: 'invalidResponse'; reason: string }

// Funktionerna kastar inga fel, varje utfall har status och skäl. Skälet är för serverns logg, aldrig för kunden.
export type ShippingCarrier = {
  name: string
  findServicePoints: (postalCode: string) => Promise<ServicePointsResult>
  estimateDelivery: (request: DeliveryRequest) => Promise<DeliveryEstimateResult>
}

// Routes hämtar transportbolaget härifrån. Byts bolag ändras bara den här raden.
export const shippingCarrier: ShippingCarrier = postnord
