import express, { type NextFunction, type Request, type Response } from 'express'
import { pool } from './db.js'
import cookieParser from 'cookie-parser'
import session from 'express-session'
import connectPgSimple from 'connect-pg-simple'
import healthRouter from './routes/health.js'
import productsRouter from './routes/products.js'
import cartRouter from './routes/cart.js'
import ordersRouter from './routes/orders.js'
import currencyRouter from './routes/currency.js'
import adminAuthRouter from './routes/adminAuth.js'
import adminProductsRouter from './routes/adminProducts.js'
import adminOrdersRouter from './routes/adminOrders.js'
import { sessionCookie } from './middleware/sessionCookie.js'
import { requireAuth } from './middleware/requireAuth.js'

declare module 'express-session' {
  interface SessionData {
    userId: number
  }
}

// Appen lyssnar inte själv. Lokalt gör server/dev.ts det, i produktion
// anropar Vercel den via api/index.ts.
// Routes behöver /api-prefix eftersom Vercel skickar in hela sökvägen.
const app = express()
app.use(cookieParser())
app.use(express.json())

const PgSession = connectPgSimple(session)

app.use(session({
  store: new PgSession({ pool, createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET!,
  name: 'admin_session',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  },
}))

app.use(sessionCookie)

app.use('/api/health', healthRouter)
app.use('/api/products', productsRouter)
app.use('/api/cart', cartRouter)
app.use('/api/orders', ordersRouter)
app.use('/api/currency', currencyRouter)

app.use('/api/admin', adminAuthRouter)
app.use('/api/admin/products', requireAuth, adminProductsRouter)
app.use('/api/admin/orders', requireAuth, adminOrdersRouter)

// Generell felhantering. Om en route kastar ett fel, loggas det och klienten får 500.
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : String(err)
  console.error(`${req.method} ${req.originalUrl} misslyckades: ${message}`)
  res.status(500).json({ error: 'Något gick fel på servern' })
})

export default app
