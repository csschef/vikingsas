import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

// Nycklarna läses först när de behövs, så att resten av servern startar även om de saknas
function getStorage() {
  const url = process.env.SUPABASE_URL
  const secretKey = process.env.SUPABASE_SECRET_KEY
  const bucket = process.env.SUPABASE_BUCKET
  if (!url || !secretKey || !bucket) {
    throw new Error('SUPABASE_URL, SUPABASE_SECRET_KEY eller SUPABASE_BUCKET saknas i miljövariablerna')
  }
  // supabase-js har ingen egen timeout, så varje anrop ger upp efter 10 sekunder
  const supabase = createClient(url, secretKey, {
    global: {
      fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10_000) }),
    },
  })
  return supabase.storage.from(bucket)
}

export type ImageType = 'image/jpeg' | 'image/png'

// Ny unik sökväg varje gång, så att ingen fil skrivs över och ingen gammal bild ligger kvar i cachen
export async function uploadProductImage(sku: string, buffer: Buffer, type: ImageType) {
  const storage = getStorage()
  const extension = type === 'image/png' ? 'png' : 'jpg'
  const path = `products/${sku}/${randomUUID()}.${extension}`

  const { error } = await storage.upload(path, buffer, { contentType: type, upsert: false })
  if (error) {
    throw new Error(`Bilden kunde inte laddas upp: ${error.message}`)
  }
  // getPublicUrl bygger bara adressen, den anropar inte Supabase
  const { data } = storage.getPublicUrl(path)
  return { path, url: data.publicUrl }
}

export async function removeProductImage(path: string) {
  const { error } = await getStorage().remove([path])
  if (error) {
    throw new Error(`Bilden kunde inte tas bort: ${error.message}`)
  }
}
