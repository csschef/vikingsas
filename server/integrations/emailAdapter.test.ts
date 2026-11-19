import { afterEach, beforeEach, describe, mock, test } from 'node:test'
import assert from 'node:assert/strict'
import { sendEmail, type Email } from './emailAdapter.js'

// Påhittad nyckel. Testerna anropar aldrig Resend, all trafik går till en låtsad fetch.
const FAKE_KEY = 're_test_0123456789abcdef'

const email: Email = {
  to: 'kund@example.com',
  subject: 'Orderbekräftelse #42 från Vikingsås',
  html: '<p>Hej</p>',
  text: 'Hej',
  idempotencyKey: 'order-confirmation/42',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

function fakeFetch(response: Response) {
  return mock.method(globalThis, 'fetch', async () => response)
}

describe('sendEmail', () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = FAKE_KEY
    process.env.EMAIL_FROM = 'Vikingsås <onboarding@resend.dev>'
  })

  afterEach(() => {
    mock.restoreAll()
  })

  test('skickar nyckeln, idempotensnyckeln och en timeout', async () => {
    const fetchMock = fakeFetch(json({ id: 'e1b2c3' }))
    assert.equal(await sendEmail(email), 'e1b2c3')

    const [url, init] = fetchMock.mock.calls[0].arguments as [string, RequestInit]
    const headers = init.headers as Record<string, string>
    assert.equal(url, 'https://api.resend.com/emails')
    assert.equal(headers.Authorization, `Bearer ${FAKE_KEY}`)
    assert.equal(headers['Idempotency-Key'], 'order-confirmation/42')
    assert.ok(init.signal instanceof AbortSignal)
  })

  test('avsändare, mottagare, html och text skickas med', async () => {
    const fetchMock = fakeFetch(json({ id: 'e1b2c3' }))
    await sendEmail(email)
    const body = JSON.parse(String((fetchMock.mock.calls[0].arguments[1] as RequestInit).body))
    assert.deepEqual(body, {
      from: 'Vikingsås <onboarding@resend.dev>',
      to: 'kund@example.com',
      subject: email.subject,
      html: email.html,
      text: email.text,
    })
  })

  test('fel nyckel ger ett fel med Resends meddelande', async () => {
    fakeFetch(json({ statusCode: 401, name: 'validation_error', message: 'API key is invalid' }, 401))
    await assert.rejects(sendEmail(email), /401: API key is invalid/)
  })

  test('mottagare som inte får testmejl ger 403', async () => {
    fakeFetch(json({ statusCode: 403, message: 'You can only send testing emails to your own email address' }, 403))
    await assert.rejects(sendEmail(email), /403/)
  })

  test('felsvar som inte är JSON ger ändå statuskoden', async () => {
    fakeFetch(new Response('<html>Bad gateway</html>', { status: 502 }))
    await assert.rejects(sendEmail(email), /Resend svarade 502$/)
  })

  test('svar utan id godtas inte', async () => {
    fakeFetch(json({ ok: true }))
    await assert.rejects(sendEmail(email), /utan id/)
  })

  test('saknad nyckel ger fel innan något skickas', async () => {
    delete process.env.RESEND_API_KEY
    const fetchMock = fakeFetch(json({ id: 'e1b2c3' }))
    await assert.rejects(sendEmail(email), /RESEND_API_KEY/)
    assert.equal(fetchMock.mock.callCount(), 0)
  })
})
