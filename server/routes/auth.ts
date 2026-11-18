import { Router, type CookieOptions, type Request } from 'express'
import { pool } from '../db.js'
import { exchangeCode, getAuthorizeUrl } from '../integrations/googleAdapter.js'
import { randomString, toCodeChallenge } from '../lib/pkce.js'
import { renewSession } from '../lib/session.js'

const router = Router()

// Kunden har tio minuter på sig hos Google. Kakorna skickas bara till /api/auth/google.
function flowCookie(req: Request): CookieOptions {
  return { httpOnly: true, sameSite: 'lax', secure: req.secure, path: '/api/auth/google', maxAge: 10 * 60 * 1000 }
}

// Felet visas som text på Mina sidor
function failed(reason: 'avbruten' | 'ogiltig' | 'google' | 'ej-verifierad') {
  return `/mina-sidor?fel=${reason}`
}

// Steg 1: länken Logga in med Google går hit, och servern skickar vidare till Google
router.get('/google', (req, res) => {
  const state = randomString()
  const codeVerifier = randomString()
  let url: string
  try {
    url = getAuthorizeUrl(state, toCodeChallenge(codeVerifier))
  } catch (error) {
    console.error(`Google-inloggningen kunde inte starta: ${error instanceof Error ? error.message : String(error)}`)
    return res.redirect(failed('google'))
  }
  // Sparas så att callbacken kan se att det är samma inloggning som kommer tillbaka
  res.cookie('oauth_state', state, flowCookie(req))
  res.cookie('oauth_verifier', codeVerifier, flowCookie(req))
  res.redirect(url)
})

// Steg 2: Google skickar tillbaka kunden hit med en kod och samma state
router.get('/google/callback', async (req, res) => {
  const { code, state, error } = req.query
  const expectedState = req.cookies.oauth_state
  const codeVerifier = req.cookies.oauth_verifier
  // Används en gång och kastas sedan
  res.clearCookie('oauth_state', flowCookie(req))
  res.clearCookie('oauth_verifier', flowCookie(req))

  // Kunden tryckte på Avbryt hos Google
  if (error === 'access_denied') {
    return res.redirect(failed('avbruten'))
  }
  if (error) {
    console.error(`Google svarade med fel: ${String(error)}`)
    return res.redirect(failed('google'))
  }

  // Inte inloggningen vi startade, till exempel en länk som någon annan har skickat
  if (typeof code !== 'string' || typeof state !== 'string' || !expectedState || state !== expectedState || !codeVerifier) {
    return res.redirect(failed('ogiltig'))
  }

  try {
    const user = await exchangeCode(code, codeVerifier)
    if (!user.emailVerified) {
      return res.redirect(failed('ej-verifierad'))
    }
    // Finns sub redan hittas samma kund, annars skapas en ny. Namn och e-post hålls aktuella.
    const customer = await pool.query(
      `INSERT INTO customers (google_sub, email, name)
       VALUES ($1, $2, $3)
       ON CONFLICT (google_sub) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name
       RETURNING id`,
      [user.sub, user.email, user.name]
    )
    await renewSession(req, { userId: req.session.userId, customerId: customer.rows[0].id })
    res.redirect('/mina-sidor')
  } catch (error) {
    console.error(`Google-inloggningen misslyckades: ${error instanceof Error ? error.message : String(error)}`)
    res.redirect(failed('google'))
  }
})

// Utloggad är ett vanligt läge för en kund, så svaret är null och inte 401
router.get('/me', async (req, res) => {
  if (!req.session.customerId) {
    return res.json({ customer: null })
  }
  const result = await pool.query('SELECT name, email FROM customers WHERE id = $1', [req.session.customerId])
  res.json({ customer: result.rows[0] ?? null })
})

router.post('/logout', async (req, res) => {
  await renewSession(req, { userId: req.session.userId })
  res.json({ status: 'ok' })
})

export default router
