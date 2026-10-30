// Det butiken behöver av ett transportbolag. Ett nytt bolag får en egen adapter som följer ShippingCarrier.

export type ServicePoint = {
  id: string
  name: string
  street: string
  postalCode: string
  city: string
  // I meter från kundens postnummer, null om bolaget inte skickar med avståndet
  distanceMeters: number | null
}

export type DeliveryEstimate = {
  // YYYY-MM-DD, kassan visar det som t.ex. "tisdag 3/11"
  date: string
}

// Funktionerna kastar ett fel om bolaget inte svarar eller skickar data som inte går att använda
export type ShippingCarrier = {
  name: string
  findServicePoints: (postalCode: string) => Promise<ServicePoint[]>
  estimateDelivery: (fromPostalCode: string, toPostalCode: string) => Promise<DeliveryEstimate>
}
