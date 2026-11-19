import { z } from 'zod'

// Den enda filen som känner till Resends adress och nyckel.
// Docs: https://resend.com/docs/api-reference/emails/send-email

const SEND_URL = 'https://api.resend.com/emails'
const TIMEOUT_MS = 5_000

// Nyckeln läses först när den behövs, så att resten av servern startar även om den saknas
function getConfig() {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM
  if (!apiKey || !from) {
    throw new Error('RESEND_API_KEY eller EMAIL_FROM saknas i miljövariablerna')
  }
  return { apiKey, from }
}

export type Email = {
  to: string
  subject: string
  html: string
  // Samma innehåll utan HTML, för e-postprogram som inte visar HTML och för spamfilter
  text: string
  // Samma nyckel inom 24 timmar ger inget nytt mejl hos Resend
  idempotencyKey: string
}

// Resends id på mejlet, det syns under Emails i Resend
const SendResponse = z.object({ id: z.string().min(1) })
const ResendError = z.object({ message: z.string() })

export async function sendEmail(email: Email): Promise<string> {
  const { apiKey, from } = getConfig()
  const response = await fetch(SEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': email.idempotencyKey,
    },
    body: JSON.stringify({ from, to: email.to, subject: email.subject, html: email.html, text: email.text }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })

  if (!response.ok) {
    const error = ResendError.safeParse(await response.json().catch(() => null))
    throw new Error(`Resend svarade ${response.status}${error.success ? `: ${error.data.message}` : ''}`)
  }

  const result = SendResponse.safeParse(await response.json())
  if (!result.success) {
    throw new Error('Resend svarade utan id')
  }
  return result.data.id
}
