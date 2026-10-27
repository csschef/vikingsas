import Stripe from 'stripe'

// En rad i ordern, med priset från databasen. pg ger NUMERIC som text, därför är price en sträng.
export type CheckoutItem = {
  title: string
  price: string
  quantity: number
}

// Så länge kunden har på sig att betala, sedan löper sessionen ut
const SESSION_MINUTES = 30

// Nyckeln läses först när den behövs, så att resten av servern startar även om den saknas
function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY saknas i miljövariablerna')
  }
  // Stripes egen standard är 80 sekunder, alldeles för länge för en kund som väntar. Väntar max 10 sekunder, sedan får kunden ett felmeddelande.
  return new Stripe(secretKey, { timeout: 10_000 })
}

export async function createCheckoutSession(orderId: number, items: CheckoutItem[], customerEmail: string) {
  const clientUrl = process.env.CLIENT_URL
  if (!clientUrl) {
    throw new Error('CLIENT_URL saknas i miljövariablerna')
  }

  const session = await getStripe().checkout.sessions.create({
    mode: 'payment',
    ui_mode: 'embedded_page',
    // Stripe räknar i öre, 49,90 kr blir 4990
    line_items: items.map((item) => ({
      quantity: item.quantity,
      price_data: {
        currency: 'sek',
        unit_amount: Math.round(Number(item.price) * 100),
        product_data: { name: item.title },
      },
    })),
    // Orderns id följer med betalningen, så att webhooken vet vilken order som betalades
    client_reference_id: String(orderId),
    // Kunden har redan skrivit sin e-post i kassan och slipper göra det igen hos Stripe
    customer_email: customerEmail,
    // Stripe byter ut {CHECKOUT_SESSION_ID} mot sessionens id innan kunden skickas tillbaka
    return_url: `${clientUrl}/tack?session_id={CHECKOUT_SESSION_ID}`,
    // Stripe räknar tiden i sekunder sedan 1970
    expires_at: Math.floor(Date.now() / 1000) + SESSION_MINUTES * 60,
    // Stripes formulär är alltid ljust, så hela rutan blir ett vitt kort med butikens knappfärg och typsnitt
    branding_settings: {
      background_color: '#ffffff',
      button_color: '#ef5417',
      border_style: 'rounded',
      font_family: 'inter',
    },
  })

  if (!session.client_secret) {
    throw new Error('Stripe skickade ingen client_secret')
  }
  return { sessionId: session.id, clientSecret: session.client_secret }
}

// Kollar att anropet verkligen kommer från Stripe och kastar ett fel om signaturen inte stämmer.
// rawBody måste vara exakt de bytes Stripe skickade, eftersom signaturen är räknad på dem.
export function verifyWebhook(rawBody: Buffer, signature: string): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET saknas i miljövariablerna')
  }
  return getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret)
}
