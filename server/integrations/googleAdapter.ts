import { z } from 'zod'

// Den enda filen som känner till Googles adresser, client id och client secret.
// Docs: https://developers.google.com/identity/openid-connect/openid-connect

const AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const TIMEOUT_MS = 5_000

// Nycklarna läses först när de behövs, så att resten av servern startar även om de saknas
function getConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const callbackUrl = process.env.GOOGLE_CALLBACK_URL
  if (!clientId || !clientSecret || !callbackUrl) {
    throw new Error('GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET eller GOOGLE_CALLBACK_URL saknas i miljövariablerna')
  }
  return { clientId, clientSecret, callbackUrl }
}

export type GoogleUser = {
  sub: string
  email: string
  emailVerified: boolean
  name: string
}

// Felsvar från Google, till exempel invalid_grant när koden redan är använd
const GoogleError = z.object({ error: z.string() })

// Bara id_token används. Googles access_token behövs inte och sparas aldrig.
const TokenResponse = z.object({ id_token: z.string().min(1) })

const IdTokenClaims = z.object({
  iss: z.enum(['https://accounts.google.com', 'accounts.google.com']),
  aud: z.string(),
  exp: z.number(),
  sub: z.string().min(1),
  email: z.email(),
  email_verified: z.boolean().optional(),
  name: z.string().trim().min(1).optional(),
})

export function getAuthorizeUrl(state: string, codeChallenge: string) {
  const { clientId, callbackUrl } = getConfig()
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    // Bara vem kunden är, inget mer
    scope: 'openid email profile',
    // Måste stå exakt likadant under Authorized redirect URIs i Google Cloud
    redirect_uri: callbackUrl,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })
  return `${AUTHORIZE_URL}?${params}`
}

// Koden byts mot tokens direkt mellan servern och Google, så client secret når aldrig webbläsaren
export async function exchangeCode(code: string, codeVerifier: string): Promise<GoogleUser> {
  const { clientId, clientSecret, callbackUrl } = getConfig()
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      code_verifier: codeVerifier,
      grant_type: 'authorization_code',
      redirect_uri: callbackUrl,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })

  if (!response.ok) {
    const error = GoogleError.safeParse(await response.json().catch(() => null))
    throw new Error(`Google tog inte emot koden (${response.status}${error.success ? `, ${error.data.error}` : ''})`)
  }

  const tokens = TokenResponse.safeParse(await response.json())
  if (!tokens.success) {
    throw new Error('Google svarade utan id_token')
  }
  return readIdToken(tokens.data.id_token, clientId)
}

// ID-token är en JWT i tre delar med punkt emellan. Mittendelen är uppgifterna om kunden, i base64url.
// Signaturen kontrolleras inte här, eftersom token kom direkt från Google över https och inte via webbläsaren.
export function readIdToken(idToken: string, clientId: string, nowSeconds = Math.floor(Date.now() / 1000)): GoogleUser {
  const payload = idToken.split('.')[1]
  if (!payload) {
    throw new Error('ID-token från Google har fel format')
  }

  let json: unknown
  try {
    json = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  } catch {
    throw new Error('ID-token från Google gick inte att läsa')
  }

  const claims = IdTokenClaims.safeParse(json)
  if (!claims.success) {
    const fields = claims.error.issues.map((issue) => issue.path.join('.')).join(', ')
    throw new Error(`ID-token från Google har oväntat innehåll i ${fields}`)
  }
  if (claims.data.aud !== clientId) {
    throw new Error('ID-token är utfärdad till en annan app')
  }
  if (claims.data.exp <= nowSeconds) {
    throw new Error('ID-token har gått ut')
  }

  return {
    sub: claims.data.sub,
    email: claims.data.email,
    emailVerified: claims.data.email_verified === true,
    name: claims.data.name ?? claims.data.email,
  }
}
