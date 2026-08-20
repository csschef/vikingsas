import { useSearchParams } from 'react-router'

function ThankYouPage() {
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('order')

  return (
    <main className="thank-you-page">
      <h1>Tack för din beställning!</h1>
      {orderId && <p className="order-number">Ordernummer: #{orderId}</p>}
      <p>
        Din order har blivit bekräftad och kommer att skickas så snart som
        möjligt.
      </p>
    </main>
  )
}

export default ThankYouPage
