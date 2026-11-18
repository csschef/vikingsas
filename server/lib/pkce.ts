import { createHash, randomBytes } from 'node:crypto'

// Slumpad sträng som ingen kan gissa. Används både till state och till PKCE:s code verifier.
export const randomString = () => randomBytes(32).toString('base64url')

// Google får hashen när inloggningen startar och själva verifiern först när koden byts
export const toCodeChallenge = (codeVerifier: string) =>
  createHash('sha256').update(codeVerifier).digest('base64url')
