import { Pool } from 'pg'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined in the environment variables. Copy .env.example file and add it to your .env and set the DATABASE_URL variable.')
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5
})