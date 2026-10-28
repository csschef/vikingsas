import { Router, type NextFunction, type Request, type Response } from 'express'
import multer from 'multer'
import { pool } from '../db.js'
import { indexProducts, removeProducts, type ProductRow } from '../integrations/searchAdapter.js'
import { removeProductImage, uploadProductImage, type ImageType } from '../integrations/storageAdapter.js'

const router = Router()

// Vercel tar emot högst 4,5 MB per anrop, så taket ligger under det
const MAX_IMAGE_MB = 4
const upload = multer({ limits: { fileSize: MAX_IMAGE_MB * 1024 * 1024 } })

// Är filen för stor eller trasig svarar vi 400 med ett begripligt fel
function receiveImage(req: Request, res: Response, next: NextFunction) {
  upload.single('image')(req, res, (error) => {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ status: 'fel', error: `Bilden är för stor, max ${MAX_IMAGE_MB} MB` })
    }
    if (error) {
      return res.status(400).json({ status: 'fel', error: 'Filen kunde inte läsas' })
    }
    next()
  })
}

// Varje filtyp börjar med samma bytes, oavsett vad filen heter
const JPEG_START = [0xff, 0xd8, 0xff]
const PNG_START = [0x89, 0x50, 0x4e, 0x47]
const RIFF_START = [0x52, 0x49, 0x46, 0x46]
const WEBP_MARK = [0x57, 0x45, 0x42, 0x50]

function startsWith(buffer: Buffer, bytes: number[]) {
  return bytes.every((byte, i) => buffer[i] === byte)
}

function detectImageType(buffer: Buffer): ImageType | null {
  if (startsWith(buffer, JPEG_START)) return 'image/jpeg'
  if (startsWith(buffer, PNG_START)) return 'image/png'
  if (startsWith(buffer, RIFF_START) && startsWith(buffer.subarray(8), WEBP_MARK)) return 'image/webp'
  return null
}

// Aktiv produkt läggs in i Algolia, avstängd tas bort. false betyder att Algolia inte svarade.
async function updateSearchIndex(product: ProductRow & { is_active: boolean }): Promise<boolean> {
  try {
    if (product.is_active) {
      await indexProducts([product])
    } else {
      await removeProducts([product.sku])
    }
    return true
  } catch (error) {
    console.error(`Sökindexet uppdaterades inte för ${product.sku}: ${error instanceof Error ? error.message : String(error)}`)
    return false
  }
}


router.get('/', async (_req, res) => {
  try {
    const products = await pool.query('SELECT * FROM products ORDER BY heat_level, sku')
    res.json({ products: products.rows })
  } catch (error) {
    res.status(500).json({
      status: 'fel',
      error: error instanceof Error ? error.message : String(error)
    })
  }
})

router.get('/:id', async (req, res) => {
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

router.post('/', async (req, res) => {
  try {
    if (!req.body.sku) {
      return res.status(400).json({ status: 'fel', error: 'Artikelnummer saknas' })
    }
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
      salt_g,
      sku,
      stock)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
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
        req.body.sku,
        req.body.stock
      ]
    )
    const product = newProduct.rows[0]
    const searchIndexed = await updateSearchIndex(product)
    res.status(201).json({ product, searchIndexed })

  }
  catch (error) {
    // SEVA todo: Förifyll nästa lediga VS-nummer på Ny produkt, så hamnar admin sällan här.
    // 23505 är Postgres felkod för att ett unikt värde redan finns
    if (error instanceof Error && 'code' in error && error.code === '23505') {
      return res.status(409).json({ status: 'fel', error: 'Artikelnumret finns redan' })
    }
    res.status(500).json({
      status: 'fel',
      error: error instanceof Error ? error.message : String(error)
    })
  }
})

router.put('/:id', async (req, res) => {
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
      is_active = $16,
      stock = $17
      WHERE id = $18
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
        req.body.stock,
        req.params.id
      ]
    )
    if (updatedProduct.rows.length === 0) {
      return res.status(404).json({ status: 'fel', error: 'Produkten finns inte' })
    }
    const product = updatedProduct.rows[0]
    const searchIndexed = await updateSearchIndex(product)
    res.json({ product, searchIndexed })
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
router.put('/:id/status', async (req, res) => {
  try {
    const updatedProduct = await pool.query(
      'UPDATE products SET is_active = $1 WHERE id = $2 RETURNING *',
      [req.body.is_active, req.params.id]
    )
    if (updatedProduct.rows.length === 0) {
      return res.status(404).json({ status: 'fel', error: 'Produkten finns inte' })
    }
    const product = updatedProduct.rows[0]
    const searchIndexed = await updateSearchIndex(product)
    res.json({ product, searchIndexed })
  } catch (error) {
    res.status(500).json({
      status: 'fel',
      error: error instanceof Error ? error.message : String(error)
    })
  }
})

router.post('/:id/image', receiveImage, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'fel', error: 'Ingen bild skickades' })
    }
    const type = detectImageType(req.file.buffer)
    if (!type) {
      return res.status(400).json({ status: 'fel', error: 'Bilden måste vara JPEG, PNG eller WEBP' })
    }

    const found = await pool.query('SELECT sku, image_path FROM products WHERE id = $1', [req.params.id])
    if (found.rows.length === 0) {
      return res.status(404).json({ status: 'fel', error: 'Produkten finns inte' })
    }
    const sku = found.rows[0].sku
    const oldPath = found.rows[0].image_path

    // Inget i databasen är ändrat än, så produkten behåller sin gamla bild om Supabase inte svarar
    let image
    try {
      image = await uploadProductImage(sku, req.file.buffer, type)
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error))
      return res.status(502).json({ status: 'fel', error: 'Bildtjänsten svarar inte. Produkten har kvar sin gamla bild, försök igen om en stund.' })
    }

    const updated = await pool.query(
      'UPDATE products SET image_path = $1, image_url = $2 WHERE id = $3 RETURNING *',
      [image.path, image.url, req.params.id]
    )

    // Den gamla filen tas bort först nu, när den nya är uppladdad och sparad
    if (oldPath) {
      try {
        await removeProductImage(oldPath)
      } catch (error) {
        // Bilden är redan bytt, den gamla filen blir bara liggande kvar i bucketen
        console.error(`Gamla bilden ${oldPath} togs inte bort: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    const product = updated.rows[0]
    const searchIndexed = await updateSearchIndex(product)
    res.json({ product, searchIndexed })

  } catch (error) {
    res.status(500).json({
      status: 'fel',
      error: error instanceof Error ? error.message : String(error)
    })
  }
})

export default router
