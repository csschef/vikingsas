import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { pool } from '../db.js'
import { requireAuth } from '../middleware/requireAuth.js'

const router = Router()

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email])
    const user = result.rows[0]

    if (!user) {
      return res.status(401).json({ status: 'fel', error: 'Fel e-post eller lösenord' })
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash)
    if (!passwordMatches) {
      return res.status(401).json({ status: 'fel', error: 'Fel e-post eller lösenord'})
    }

    req.session.userId = user.id
    res.json({ email: user.email})
  } catch (error) {
    res.status(500).json({
      status: 'fel',
      error: error instanceof Error ? error.message : String(error),
    })
  }
})

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ status: 'ok' })
  })
})

router.get('/me', requireAuth, (_req, res) => {
  res.json({ status: 'ok' })
})

export default router
