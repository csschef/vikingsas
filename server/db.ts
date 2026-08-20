import { Pool } from 'pg'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL är inte definierad i miljövariablerna. Kopiera filen .env.example till .env och ange variabeln DATABASE_URL där.')
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5
})
