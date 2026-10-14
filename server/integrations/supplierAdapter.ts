import { parse } from 'csv-parse/sync'
import { XMLParser } from 'fast-xml-parser'
import { SyntaxValidator } from 'fast-xml-validator'

const TIMEOUT_MS = 10000

export type CatalogFormat = 'csv' | 'xml'

// En produkt ur leverantörens fil i vår modell, men inte validerad än
export type ProductCandidate = {
  sku: string
  ean: string
  title: string
  category: string
  price: number
  stock: number | null
  variants: string[]
}

// "79,00" och "79.00" blir 79. Text som "ej satt" blir NaN och stoppas av Zod i routen.
function parseDecimal(value: unknown): number {
  const text = String(value ?? '').replace(/\s/g, '').replace(',', '.')
  return text === '' ? NaN : Number(text)
}

// Tomt lagersaldo betyder att leverantören inte vet, då sparas null
function parseStock(value: unknown): number | null {
  const text = String(value ?? '').trim()
  return text === '' ? null : Number(text)
}

type CsvRow = {
  artNr: string
  ean: string
  benamning: string
  kategori: string
  pris: string
  lagersaldo: string
  varianter: string
}

function parseCsv(buffer: ArrayBuffer): ProductCandidate[] {
  // Filen är Windows-1252. Läses den som UTF-8 blir åäö fel.
  const text = new TextDecoder('windows-1252').decode(buffer)

  const rows = parse<CsvRow>(text, {
    columns: true,
    delimiter: ';',
    skip_empty_lines: true,
    trim: true,
  })

  return rows.map((row) => ({
    sku: row.artNr,
    ean: row.ean,
    title: row.benamning,
    category: row.kategori,
    price: parseDecimal(row.pris),
    stock: parseStock(row.lagersaldo),
    variants: row.varianter ? row.varianter.split('|') : [],
  }))
}

type XmlProduct = {
  '@_artNr'?: string
  ean?: string
  benamning?: string
  kategori?: string
  pris?: { '#text'?: string }
  lagersaldo?: string
  varianter?: { variant?: string[] } | ''
}

const xmlParser = new XMLParser({
  ignoreAttributes: false, // artNr är ett attribut
  parseTagValue: false, // allt som text, annars tappar EAN nollan i början
  isArray: (name) => name === 'produkt' || name === 'variant', // en enda variant ska också bli en lista
})

function parseXml(buffer: ArrayBuffer): ProductCandidate[] {
  const text = new TextDecoder('utf-8').decode(buffer)

  // XMLParser säger inget om filen är trasig, så den kontrolleras först. Trasig XML kastar ett fel.
  try {
    SyntaxValidator.validate(text)
  } catch (err) {
    throw new Error(`Ogiltig XML från leverantören: ${err instanceof Error ? err.message : String(err)}`)
  }

  const products: XmlProduct[] | undefined = xmlParser.parse(text)?.katalog?.produkt
  if (!Array.isArray(products)) {
    throw new Error('XML-filen saknar <katalog> med <produkt>')
  }

  return products.map((product) => ({
    sku: product['@_artNr'] ?? '',
    ean: product.ean ?? '',
    title: product.benamning ?? '',
    category: product.kategori ?? '',
    price: parseDecimal(product.pris?.['#text']),
    stock: parseStock(product.lagersaldo),
    variants: typeof product.varianter === 'object' ? (product.varianter.variant ?? []) : [],
  }))
}

export async function getSupplierCatalog(format: CatalogFormat): Promise<ProductCandidate[]> {
  const baseUrl = process.env.SUPPLIER_API_URL
  const apiKey = process.env.SUPPLIER_API_KEY
  if (!baseUrl || !apiKey) {
    throw new Error('SUPPLIER_API_URL eller SUPPLIER_API_KEY saknas i miljövariablerna')
  }

  const url = new URL(`${baseUrl}/export/products.${format}`)
  url.searchParams.set('bransch', process.env.SUPPLIER_BRANSCH ?? 'chilisas')

  let response: Response
  try {
    response = await fetch(url, {
      headers: { 'X-Api-Key': apiKey },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      throw new Error(`Inget svar från leverantören inom ${TIMEOUT_MS} ms (timeout)`)
    }
    throw new Error('Kunde inte nå leverantören (nätverksfel)', { cause: err })
  }

  if (!response.ok) {
    throw new Error(`Leverantören svarade med status ${response.status} ${response.statusText}`)
  }

  // Bytes i stället för text(), eftersom text() alltid läser som UTF-8
  const buffer = await response.arrayBuffer()

  return format === 'csv' ? parseCsv(buffer) : parseXml(buffer)
}
