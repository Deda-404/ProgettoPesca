import { compressCatchPhoto, formatPhotoBytes } from './photos'
import { supabase } from './supabase'

export const SPOT_PHOTO_BUCKET = 'spot-photos'
export const SPOT_PHOTO_HARD_LIMIT = 512 * 1024
const SIGNED_URL_SECONDS = 6 * 60 * 60

const LOCAL_DB = 'xfish-spot-media-v1'
const LOCAL_STORE = 'spot-photos'

export const compressSpotPhoto = compressCatchPhoto
export { formatPhotoBytes }

export async function uploadSpotPhoto(userId, spotId, blob, { versioned = false } = {}) {
  if (!supabase || !userId || !spotId || !blob) throw new Error('Cloud foto spot non disponibile.')
  if (blob.size > SPOT_PHOTO_HARD_LIMIT) throw new Error('La foto compressa supera il limite XFish di 512 KB.')

  const extension = blob.type === 'image/jpeg' ? 'jpg' : 'webp'
  const suffix = versioned ? `-${crypto.randomUUID()}` : ''
  const path = `${userId}/${spotId}${suffix}.${extension}`
  const { error } = await supabase.storage
    .from(SPOT_PHOTO_BUCKET)
    .upload(path, blob, {
      contentType: blob.type || 'image/webp',
      cacheControl: '31536000',
      upsert: false,
    })

  if (error) throw error
  return path
}

export async function removeSpotPhoto(path) {
  if (!supabase || !path) return
  const { error } = await supabase.storage.from(SPOT_PHOTO_BUCKET).remove([path])
  if (error) throw error
}

export async function signSpotPhotoPaths(paths) {
  if (!supabase) return new Map()
  const unique = [...new Set((paths ?? []).filter(Boolean))]
  if (!unique.length) return new Map()

  const { data, error } = await supabase.storage
    .from(SPOT_PHOTO_BUCKET)
    .createSignedUrls(unique, SIGNED_URL_SECONDS)
  if (error) throw error

  return new Map((data ?? [])
    .filter((item) => item?.path && item?.signedUrl)
    .map((item) => [item.path, item.signedUrl]))
}

function openLocalDb() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('Il salvataggio locale delle foto spot non è supportato da questo browser.'))
      return
    }

    const request = indexedDB.open(LOCAL_DB, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(LOCAL_STORE)) db.createObjectStore(LOCAL_STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('Archivio foto spot locale non disponibile.'))
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
      request.onerror = () => reject(request.error || new Error('Errore archivio foto spot locale.'))
    })
  } finally {
    db.close()
  }
}

export async function saveLocalSpotPhoto(spotId, blob) {
  await localPhotoRequest('readwrite', spotId, blob)
  return spotId
}

export async function loadLocalSpotPhoto(spotId) {
  if (!spotId) return null
  return localPhotoRequest('readonly', spotId)
}

export async function deleteLocalSpotPhoto(spotId) {
  if (!spotId) return
  await localPhotoRequest('readwrite', spotId)
}
