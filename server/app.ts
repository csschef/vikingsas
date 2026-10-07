import express from 'express'
import { pool } from './db.js'
import cookieParser from 'cookie-parser'
import session from 'express-session'
import connectPgSimple from 'connect-pg-simple'
import bcrypt from 'bcryptjs'
import healthRouter from './routes/health.js'
import productsRouter from './routes/products.js'
import { sessionCookie } from './middleware/sessionCookie.js'
import { getCartId } from './lib/cart.js'
import cartRouter from './routes/cart.js'

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

const adminRouter = express.Router()

adminRouter.post('/login', async (req, res) => {
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

adminRouter.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ status: 'ok' })
  })
})

function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ status: 'fel', error: 'Inte inloggad' })
  }
  next()
}

adminRouter.use(requireAuth)

adminRouter.get('/me', (_req, res) => {
  res.json({ status: 'ok' })
})

adminRouter.get('/products', async (_req, res) => {
  try {
    const products = await pool.query('SELECT * FROM products ORDER BY heat_level')
    res.json({ products: products.rows })
  } catch (error) {
    res.status(500).json({
      status: 'fel',
      error: error instanceof Error ? error.message : String(error)
    })
  }
})

adminRouter.get('/products/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id])
    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'fel', error: 'Produkten finns inte' })
    }
    res.json({ product: result.rows[0] })
  } catch (error) {
    res.status(500).json({
      status: 'fel',
      error: error instanceof Error ? error.message : String(error)
    })
  }
})

adminRouter.post('/products', async (req, res) => {
  try {
    const newProduct = await pool.query(
      `INSERT INTO products (
      title,
      description,
      volume_ml,
      price,
      heat_level,
      image_url,
      ingredients,
      energy_kj,
      energy_kcal,
      fat_g,
      saturated_fat_g,
      carbohydrate_g,
      sugars_g,
      protein_g,
      salt_g)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        req.body.title,
        req.body.description,
        req.body.volume_ml,
        req.body.price,
        req.body.heat_level,
        req.body.image_url,
        req.body.ingredients,
        req.body.energy_kj,
        req.body.energy_kcal,
        req.body.fat_g,
        req.body.saturated_fat_g,
        req.body.carbohydrate_g,
        req.body.sugars_g,
        req.body.protein_g,
        req.body.salt_g
      ]
    )
    res.status(201).json({ product: newProduct.rows[0] })
  }
  catch (error) {
    res.status(500).json({
      status: 'fel',
      error: error instanceof Error ? error.message : String(error)
    })
  }
})

adminRouter.put('/products/:id', async (req, res) => {
  try {
    const updatedProduct = await pool.query(
      `UPDATE products SET
      title = $1,
      description = $2,
      volume_ml = $3,
      price = $4,
      heat_level = $5,
      image_url = $6,
      ingredients = $7,
      energy_kj = $8,
      energy_kcal = $9,
      fat_g = $10,
      saturated_fat_g = $11,
      carbohydrate_g = $12,
      sugars_g = $13,
      protein_g = $14,
      salt_g = $15,
      is_active = $16
      WHERE id = $17
      RETURNING *`,
      [
        req.body.title,
        req.body.description,
        req.body.volume_ml,
        req.body.price,
        req.body.heat_level,
        req.body.image_url,
        req.body.ingredients,
        req.body.energy_kj,
        req.body.energy_kcal,
        req.body.fat_g,
        req.body.saturated_fat_g,
        req.body.carbohydrate_g,
        req.body.sugars_g,
        req.body.protein_g,
        req.body.salt_g,
        req.body.is_active,
        req.params.id
      ]
    )
    if (updatedProduct.rows.length === 0) {
      return res.status(404).json({ status: 'fel', error: 'Produkten finns inte' })
    }
    res.json({ product: updatedProduct.rows[0] })
  }
  catch (error) {
    res.status(500).json({
      status: 'fel',
      error: error instanceof Error ? error.message : String(error)
    })
  }
})
// En produkt raderas inte från databasen, utan markeras som inaktiv.
// På så sätt kan vi behålla historik och undvika problem med ordrar som refererar
// till produkter som inte längre finns.
adminRouter.put('/products/:id/status', async (req, res) => {
  try {
    const updatedProduct = await pool.query(
      'UPDATE products SET is_active = $1 WHERE id = $2 RETURNING *',
      [req.body.is_active, req.params.id]
    )
    if (updatedProduct.rows.length === 0) {
      return res.status(404).json({ status: 'fel', error: 'Produkten finns inte' })
    }
    res.json({ product: updatedProduct.rows[0] })
  } catch (error) {
    res.status(500).json({
      status: 'fel',
      error: error instanceof Error ? error.message : String(error)
    })
  }
})

adminRouter.get('/orders', async (_req, res) => {
  try {
    const orders = await pool.query(
      `SELECT o.id, o.customer_name, o.customer_email, o.total_amount, o.created_at, o.status,
              json_agg(json_build_object(
                'product_id', oi.product_id,
                'product_title', oi.product_title,
                'unit_price', oi.unit_price,
                'quantity', oi.quantity
              )) AS items
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       GROUP BY o.id
       ORDER BY o.created_at DESC`
    )
    res.json({ orders: orders.rows })
  } catch (error) {
    res.status(500).json({
      status: 'fel',
      error: error instanceof Error ? error.message : String(error)
    })
  }
})

adminRouter.get('/orders/:id', async (req, res) => {
  try {
    const order = await pool.query(
      `SELECT o.id, o.customer_name, o.customer_email, o.total_amount, o.created_at, o.status,
              json_agg(json_build_object(
                'product_id', oi.product_id,
                'product_title', oi.product_title,
                'unit_price', oi.unit_price,
                'quantity', oi.quantity
              )) AS items
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       WHERE o.id = $1
       GROUP BY o.id`,
      [req.params.id]
    )
    if (order.rows.length === 0) {
      return res.status(404).json({ status: 'fel', error: 'Ordern finns inte' })
    }
    res.json({ order: order.rows[0] })
  } catch (error) {
    res.status(500).json({
      status: 'fel',
      error: error instanceof Error ? error.message : String(error)
    })
  }
})

adminRouter.put('/orders/:id/status', async (req, res) => {
  try {
    const updatedOrder = await pool.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [req.body.status, req.params.id]
    )
    if (updatedOrder.rows.length === 0) {
      return res.status(404).json({ status: 'fel', error: 'Ordern finns inte' })
    }
    res.json({ order: updatedOrder.rows[0] })
  } catch (error) {
    res.status(500).json({
      status: 'fel',
      error: error instanceof Error ? error.message : String(error)
    })
  }
})

app.use('/api/admin', adminRouter)
app.use('/api/health', healthRouter)
app.use('/api/products', productsRouter)
app.use('/api/cart', cartRouter)

app.post('/api/orders', async (req, res) => {
  const cartId = await getCartId(req.cookies.session_id)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await client.query(
      `SELECT ci.product_id, ci.quantity, p.title, p.price
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.cart_id = $1
       ORDER BY ci.id`,
      [cartId]
    )

    if (result.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(400).json({ status: 'fel', error: 'Varukorgen är tom' })
    }

    const total = result.rows.reduce(
      (summa, row) => summa + Number(row.price) * row.quantity,
      0,
    )

    const order = await client.query(
      `INSERT INTO orders (customer_name, customer_email, total_amount)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [req.body.customer_name, req.body.customer_email, total]
    )
    const orderId = order.rows[0].id

    for (const row of result.rows) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_title, unit_price, quantity)
         VALUES ($1, $2, $3, $4, $5)`,
        [orderId, row.product_id, row.title, row.price, row.quantity]
      )
    }

    await client.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId])

    await client.query('COMMIT')
    res.status(201).json({ order_id: orderId })
  } catch (error) {
    await client.query('ROLLBACK')
    res.status(500).json({
      status: 'fel',
      error: error instanceof Error ? error.message : String(error),
    })
  } finally {
    client.release()
  }
})


export default app
