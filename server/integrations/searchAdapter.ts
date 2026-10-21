import { algoliasearch } from 'algoliasearch'

// Så ser en produkt ut i Algolia. sku blir objectID.
type SearchRecord = {
  objectID: string
  id: number
  title: string
  description: string | null
  category: string | null
  price: number
  heat_level: number | null
  image_url: string | null
  stock: number | null
}

// Algolias egen timeout, i millisekunder
const TIMEOUTS = { connect: 2000, read: 5000, write: 10000 }

// Nycklarna läses först när de behövs, så att resten av servern startar även om de saknas
function getConfig() {
  const appId = process.env.ALGOLIA_APP_ID
  const adminKey = process.env.ALGOLIA_WRITE_KEY
  const searchKey = process.env.ALGOLIA_SEARCH_KEY
  const indexName = process.env.ALGOLIA_INDEX
  if (!appId || !adminKey || !searchKey || !indexName) {
    throw new Error('ALGOLIA_APP_ID, ALGOLIA_WRITE_KEY, ALGOLIA_SEARCH_KEY eller ALGOLIA_INDEX saknas i miljövariablerna')
  }
  return { appId, adminKey, searchKey, indexName }
}

// En rad ur products-tabellen. pg ger NUMERIC som text, därför är price en sträng.
type ProductRow = {
  id: number
  sku: string
  title: string
  description: string | null
  category: string | null
  price: string
  heat_level: number | null
  image_url: string | null
  stock: number | null
}

export async function indexProducts(products: ProductRow[]): Promise<number> {
  const { appId, adminKey, indexName } = getConfig()
  const client = algoliasearch(appId, adminKey, { timeouts: TIMEOUTS })

  const records: SearchRecord[] = products.map((product) => ({
    objectID: product.sku,
    id: product.id,
    title: product.title,
    description: product.description,
    category: product.category,
    price: Number(product.price),
    heat_level: product.heat_level,
    image_url: product.image_url,
    stock: product.stock,
  }))

  // Samma objectID igen uppdaterar produkten i stället för att lägga till en ny
  await client.saveObjects({ indexName, objects: records, waitForTasks: true })
  return records.length
}

export async function searchProducts(query: string, page: number, pageSize: number) {
  const { appId, searchKey, indexName } = getConfig()
  const client = algoliasearch(appId, searchKey, { timeouts: TIMEOUTS })

  // Vi räknar sidor från 1, Algolia från 0
  const response = await client.searchSingleIndex<SearchRecord>({
    indexName,
    searchParams: { query, page: page - 1, hitsPerPage: pageSize },
  })

  // Tillbaka till butikens format, objectID blir sku igen
  const products = response.hits.map((hit) => ({
    id: hit.id,
    sku: hit.objectID,
    title: hit.title,
    description: hit.description,
    category: hit.category,
    price: hit.price,
    heat_level: hit.heat_level,
    image_url: hit.image_url,
    stock: hit.stock,
  }))

  const total = response.nbHits ?? 0
  return {
    products,
    meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  }
}
