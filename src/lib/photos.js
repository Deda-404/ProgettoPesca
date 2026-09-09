import { supabase } from './supabase'

export const CATCH_PHOTO_BUCKET = 'catch-photos'
export const CATCH_PHOTO_HARD_LIMIT = 512 * 1024
const TARGET_BYTES = 360 * 1024
const INPUT_LIMIT_BYTES = 25 * 1024 * 1024
const SIGNED_URL_SECONDS = 6 * 60 * 60

const LOCAL_DB = 'xfish-media-v1'
const LOCAL_STORE = 'catch-photos'

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

async function decodeImage(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close?.(),
      }
    } catch {
      // Fallback sotto per browser che non supportano imageOrientation.
    }
  }

  const objectUrl = URL.createObjectURL(file)
  const image = new Image()
  image.decoding = 'async'
  image.src = objectUrl
  await new Promise((resolve, reject) => {
    image.onload = resolve
    image.onerror = () => reject(new Error('Non riesco a leggere questa immagine.'))
  })

  return {
    source: image,
    width: image.naturalWidth,
    height: image.naturalHeight,
    close: () => URL.revokeObjectURL(objectUrl),
  }
}

function resultFor(blob, width, height, originalBytes) {
  return {
    blob,
    width,
    height,
    originalBytes,
    compressedBytes: blob.size,
    contentType: blob.type || 'image/webp',
  }
}

export async function compressCatchPhoto(file) {
  if (!(file instanceof Blob) || !file.type?.startsWith('image/')) {
    throw new Error('Seleziona un file immagine valido.')
  }
  if (file.size > INPUT_LIMIT_BYTES) {
    throw new Error('La foto originale supera 25 MB. Scegline una più piccola.')
  }

  const decoded = await decodeImage(file)
  const maxSourceEdge = Math.max(decoded.width, decoded.height)
  let best = null

  try {
    for (const maxEdge of [1600, 1400, 1200, 1000]) {
      const scale = Math.min(1, maxEdge / maxSourceEdge)
      const width = Math.max(1, Math.round(decoded.width * scale))
      const height = Math.max(1, Math.round(decoded.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d', { alpha: false })
      if (!context) throw new Error('Compressione immagine non disponibile su questo browser.')
      context.drawImage(decoded.source, 0, 0, width, height)

      for (const quality of [0.8, 0.7, 0.6, 0.52]) {
        let blob = await canvasToBlob(canvas, 'image/webp', quality)
        if (!blob) blob = await canvasToBlob(canvas, 'image/jpeg', quality)
        if (!blob) continue

        const candidate = resultFor(blob, width, height, file.size)
        if (!best || candidate.compressedBytes < best.compressedBytes) best = candidate
        if (candidate.compressedBytes <= TARGET_BYTES) return candidate
      }
    }
  } finally {
    decoded.close()
  }

  if (best?.compressedBytes <= CATCH_PHOTO_HARD_LIMIT) return best
  throw new Error('Non riesco a comprimere la foto sotto 512 KB. Prova un’altra immagine.')
}

export function formatPhotoBytes(bytes) {
  if (!Number.isFinite(bytes)) return '—'
  if (bytes < 1024) return `${bytes} B`
  return `${Math.round(bytes / 1024)} KB`
}

export async function uploadCatchPhoto(userId, catchId, blob) {
  if (!supabase || !userId || !catchId || !blob) throw new Error('Cloud foto non disponibile.')
  if (blob.size > CATCH_PHOTO_HARD_LIMIT) throw new Error('La foto compressa supera il limite XFish di 512 KB.')

  const extension = blob.type === 'image/jpeg' ? 'jpg' : 'webp'
  const path = `${userId}/${catchId}.${extension}`
  const { error } = await supabase.storage
    .from(CATCH_PHOTO_BUCKET)
    .upload(path, blob, {
      contentType: blob.type || 'image/webp',
      cacheControl: '31536000',
      upsert: false,
    })

  if (error) throw error
  return path
}

export async function removeCatchPhoto(path) {
  if (!supabase || !path) return
  const { error } = await supabase.storage.from(CATCH_PHOTO_BUCKET).remove([path])
  if (error) throw error
}

export async function signCatchPhotoPath(path) {
  if (!supabase || !path) return ''
  const { data, error } = await supabase.storage
    .from(CATCH_PHOTO_BUCKET)
    .createSignedUrl(path, SIGNED_URL_SECONDS)
  if (error) throw error
  return data?.signedUrl || ''
}

export async function signCatchPhotoPaths(paths) {
  if (!supabase) return new Map()
  const unique = [...new Set((paths ?? []).filter(Boolean))]
  if (!unique.length) return new Map()

  const { data, error } = await supabase.storage
    .from(CATCH_PHOTO_BUCKET)
    .createSignedUrls(unique, SIGNED_URL_SECONDS)
  if (error) throw error

  return new Map((data ?? [])
    .filter((item) => item?.path && item?.signedUrl)
    .map((item) => [item.path, item.signedUrl]))
}

function openLocalDb() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('Il salvataggio locale delle foto non è supportato da questo browser.'))
      return
    }

    const request = indexedDB.open(LOCAL_DB, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(LOCAL_STORE)) db.createObjectStore(LOCAL_STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('Archivio foto locale non disponibile.'))
  })
}

async function localPhotoRequest(mode, key, value) {
  const db = await openLocalDb()
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(LOCAL_STORE, mode)
      const store = transaction.objectStore(LOCAL_STORE)
      const request = value === undefined
        ? (mode === 'readonly' ? store.get(key) : store.delete(key))
        : store.put(value, key)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error || new Error('Errore archivio foto locale.'))
    })
  } finally {
    db.close()
  }
}

export async function saveLocalCatchPhoto(catchId, blob) {
  await localPhotoRequest('readwrite', catchId, blob)
  return catchId
}

export async function loadLocalCatchPhoto(catchId) {
  if (!catchId) return null
  return localPhotoRequest('readonly', catchId)
}

export async function deleteLocalCatchPhoto(catchId) {
  if (!catchId) return
  await localPhotoRequest('readwrite', catchId)
}
