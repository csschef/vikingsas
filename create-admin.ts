import { Pool } from 'pg'
import bcrypt from 'bcryptjs'

const [email, password] = process.argv.slice(2)

if (!email || !password) {
  console.error('Användning: npx tsx --env-file=.env create-admin.ts <email> <lösenord>')
  process.exit(1)
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const passwordHash = await bcrypt.hash(password, 10)
await pool.query(
  'INSERT INTO users (email, password_hash) VALUES ($1, $2)',
  [email, passwordHash],
)
await pool.end()

console.log('Admin skapad:', email)
