import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { readIdToken } from './googleAdapter.js'
import { randomString, toCodeChallenge } from '../lib/pkce.js'

const CLIENT_ID = 'vikingsas.apps.googleusercontent.com'
const NOW = 1_800_000_000

// En JWT byggd för hand. Signaturen spelar ingen roll, den läses inte.
function idToken(claims: Record<string, unknown>) {
  const part = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${part({ alg: 'RS256', typ: 'JWT' })}.${part(claims)}.signatur`
}

const valid = {
  iss: 'https://accounts.google.com',
  aud: CLIENT_ID,
  exp: NOW + 3600,
  sub: '110169484474386276334',
  email: 'kund@example.com',
  email_verified: true,
  name: 'Kim Kund',
}

describe('readIdToken', () => {
  test('läser kunden ur en giltig token', () => {
    assert.deepEqual(readIdToken(idToken(valid), CLIENT_ID, NOW), {
      sub: '110169484474386276334',
      email: 'kund@example.com',
      emailVerified: true,
      name: 'Kim Kund',
    })
  })

  test('iss utan https godtas, Google använder båda', () => {
    assert.equal(readIdToken(idToken({ ...valid, iss: 'accounts.google.com' }), CLIENT_ID, NOW).sub, valid.sub)
  })

  test('annan utfärdare avvisas', () => {
    assert.throws(() => readIdToken(idToken({ ...valid, iss: 'https://evil.example' }), CLIENT_ID, NOW), /iss/)
  })

  test('token till en annan app avvisas', () => {
    assert.throws(() => readIdToken(idToken({ ...valid, aud: 'annan-app' }), CLIENT_ID, NOW), /annan app/)
  })

  test('utgången token avvisas', () => {
    assert.throws(() => readIdToken(idToken({ ...valid, exp: NOW }), CLIENT_ID, NOW), /gått ut/)
  })

  test('token utan sub avvisas', () => {
    const { sub: _sub, ...withoutSub } = valid
    assert.throws(() => readIdToken(idToken(withoutSub), CLIENT_ID, NOW), /sub/)
  })

  test('ogiltig e-post avvisas', () => {
    assert.throws(() => readIdToken(idToken({ ...valid, email: 'inte-en-adress' }), CLIENT_ID, NOW), /email/)
  })

  test('saknas email_verified räknas e-posten som ej verifierad', () => {
    const { email_verified: _verified, ...withoutVerified } = valid
    assert.equal(readIdToken(idToken(withoutVerified), CLIENT_ID, NOW).emailVerified, false)
  })

  test('saknas namnet används e-postadressen', () => {
    const { name: _name, ...withoutName } = valid
    assert.equal(readIdToken(idToken(withoutName), CLIENT_ID, NOW).name, 'kund@example.com')
  })

  test('något som inte är en JWT avvisas', () => {
    assert.throws(() => readIdToken('inte-en-jwt', CLIENT_ID, NOW), /fel format/)
    assert.throws(() => readIdToken('a.!!!.c', CLIENT_ID, NOW), /gick inte att läsa/)
  })
})

describe('PKCE', () => {
  test('samma verifier ger alltid samma challenge', () => {
    const verifier = randomString()
    assert.equal(toCodeChallenge(verifier), toCodeChallenge(verifier))
  })

  test('challenge är en SHA-256 i base64url, 43 tecken', () => {
    assert.match(toCodeChallenge(randomString()), /^[A-Za-z0-9_-]{43}$/)
  })

  test('två inloggningar får olika värden', () => {
    assert.notEqual(randomString(), randomString())
  })
})
