import { Router } from 'express'
import { z } from 'zod'
import { pool } from '../db.js'
import { getSupplierCatalog } from '../integrations/supplierAdapter.js'

const router = Router()

// Butikens krav på en produkt innan den sparas, samma för CSV och XML
const ImportedProductSchema = z.object({
  sku: z.string().min(1, 'Artikelnummer saknas'),
  ean: z.string().regex(/^\d{13}$/, 'EAN ska vara 13 siffror'),
  title: z.string().min(1, 'Benämning saknas'),
  category: z.string().min(1, 'Kategori saknas'),
  price: z.number({ error: 'Priset saknas eller är inte ett tal' }).positive('Priset måste vara större än 0'),
  stock: z
    .number({ error: 'Lagersaldot är inte ett tal' })
    .int('Lagersaldot måste vara ett heltal')
    .min(0, 'Lagersaldot kan inte vara negativt')
    .nullable(),
  variants: z.array(z.string().min(1, 'En variant är tom')),
})

type SkippedProduct = {
  sku: string
  reason: string
}

router.post('/:format', async (req, res) => {
  const { format } = req.params
  if (format !== 'csv' && format !== 'xml') {
    return res.status(400).json({ error: 'Formatet måste vara csv eller xml' })
  }

  let candidates
  try {
    candidates = await getSupplierCatalog(format)
  } catch (error) {
    console.error(`Importen misslyckades: ${error instanceof Error ? error.message : String(error)}`)
    return res.status(502).json({ error: 'Kunde inte hämta katalogen från leverantören. Försök igen senare.' })
  }

  // De som redan finns, så att rapporten kan skilja på nya och uppdaterade
  const existing = await pool.query('SELECT sku FROM products WHERE sku = ANY($1)', [
    candidates.map((candidate) => candidate.sku),
  ])
  const knownSkus = new Set<string>(existing.rows.map((row) => row.sku))

  let created = 0
  let updated = 0
  const skipped: SkippedProduct[] = []

  for (const candidate of candidates) {
    const result = ImportedProductSchema.safeParse(candidate)
    if (!result.success) {
      skipped.push({
        sku: candidate.sku || 'Okänt artikelnummer',
        reason: result.error.issues.map((issue) => issue.message).join(', '),
      })
      continue
    }

    const product = result.data
    // Bara leverantörens fält skrivs över. Det admin själv har fyllt i rörs inte.
    await pool.query(
      `INSERT INTO products (sku, ean, title, category, price, stock, variants)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (sku) DO UPDATE SET
      ean = EXCLUDED.ean,
      title = EXCLUDED.title,
      category = EXCLUDED.category,
      price = EXCLUDED.price,
      stock = EXCLUDED.stock,
      variants = EXCLUDED.variants`,
      [product.sku, product.ean, product.title, product.category, product.price, product.stock, product.variants],
    )

    if (knownSkus.has(product.sku)) {
      updated++
    } else {
      created++
      knownSkus.add(product.sku)
    }
  }

  res.json({ format, created, updated, skipped })
})

export default router
