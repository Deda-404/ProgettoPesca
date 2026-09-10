import { removeSpotPhoto, signSpotPhotoPaths, uploadSpotPhoto } from './spotPhotos'
import { supabase } from './supabase'

function mapSpot(row, signedUrls = new Map()) {
  return {
    id: row.id,
    name: row.name,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    type: row.spot_type || 'altro',
    notes: row.notes || '',
    isPrivate: row.is_private !== false,
    photoPath: row.photo_path || '',
    photoUrl: row.photo_path ? (signedUrls.get(row.photo_path) || '') : '',
    photoLocalKey: '',
    createdAt: row.created_at,
    synced: true,
  }
}

const spotSelect = 'id,name,latitude,longitude,spot_type,notes,is_private,photo_path,created_at'

export async function loadRemoteSpots(userId) {
  if (!supabase || !userId) return []

  const { data, error } = await supabase
    .from('fishing_spots')
    .select(spotSelect)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(250)

  if (error) throw error

  const rows = data || []
  let signedUrls = new Map()
  try {
    signedUrls = await signSpotPhotoPaths(rows.map((row) => row.photo_path))
  } catch {
    // Gli spot restano utilizzabili anche se la firma delle immagini non riesce.
  }
  return rows.map((row) => mapSpot(row, signedUrls))
}

export async function createRemoteSpot(userId, spot) {
  if (!supabase || !userId) throw new Error('Cloud XFish non disponibile.')

  const spotId = spot.id || crypto.randomUUID()
  let photoPath = ''

  try {
    if (spot.photoBlob) photoPath = await uploadSpotPhoto(userId, spotId, spot.photoBlob)

    const payload = {
      id: spotId,
      user_id: userId,
      name: spot.name.trim(),
      latitude: Number(spot.latitude),
      longitude: Number(spot.longitude),
      spot_type: spot.type || 'altro',
      notes: spot.notes?.trim() || null,
      is_private: spot.isPrivate !== false,
      photo_path: photoPath || null,
    }

    const { data, error } = await supabase
      .from('fishing_spots')
      .insert(payload)
      .select(spotSelect)
      .single()

    if (error) throw error

    let signedUrls = new Map()
    if (photoPath) {
      try {
        signedUrls = await signSpotPhotoPaths([photoPath])
      } catch {
        // Il record è salvo; la foto verrà firmata al prossimo caricamento.
      }
    }
    return mapSpot(data, signedUrls)
  } catch (error) {
    if (photoPath) {
      try { await removeSpotPhoto(photoPath) } catch { /* pulizia best-effort */ }
    }
    throw error
  }
}

export async function updateRemoteSpot(userId, spot) {
  if (!supabase || !userId) throw new Error('Cloud XFish non disponibile.')
  if (!spot?.id) throw new Error('Spot non valido.')

  const previousPhotoPath = spot.photoPath || ''
  let nextPhotoPath = spot.removePhoto ? '' : previousPhotoPath
  let uploadedPhotoPath = ''

  try {
    if (spot.photoBlob) {
      uploadedPhotoPath = await uploadSpotPhoto(userId, spot.id, spot.photoBlob, { versioned: true })
      nextPhotoPath = uploadedPhotoPath
    }

    const payload = {
      name: spot.name.trim(),
      latitude: Number(spot.latitude),
      longitude: Number(spot.longitude),
      spot_type: spot.type || 'altro',
      notes: spot.notes?.trim() || null,
      is_private: spot.isPrivate !== false,
      photo_path: nextPhotoPath || null,
    }

    const { data, error } = await supabase
      .from('fishing_spots')
      .update(payload)
      .eq('id', spot.id)
      .eq('user_id', userId)
      .select(spotSelect)
      .single()

    if (error) throw error

    let signedUrls = new Map()
    if (nextPhotoPath) {
      try {
        signedUrls = await signSpotPhotoPaths([nextPhotoPath])
      } catch {
        // Lo spot resta aggiornato; la foto verrà firmata al prossimo caricamento.
      }
    }

    const saved = mapSpot(data, signedUrls)
    if (previousPhotoPath && previousPhotoPath !== nextPhotoPath) {
      try {
        await removeSpotPhoto(previousPhotoPath)
      } catch {
        return { ...saved, photoCleanupPending: true }
      }
    }
    return saved
  } catch (error) {
    if (uploadedPhotoPath) {
      try { await removeSpotPhoto(uploadedPhotoPath) } catch { /* pulizia best-effort */ }
    }
    throw error
  }
}

export async function deleteRemoteSpot(userId, spotOrId) {
  if (!supabase || !userId) throw new Error('Cloud XFish non disponibile.')

  const spotId = typeof spotOrId === 'string' ? spotOrId : spotOrId?.id
  if (!spotId) throw new Error('Spot non valido.')

  let photoPath = typeof spotOrId === 'object' ? (spotOrId.photoPath || '') : ''
  if (!photoPath) {
    const { data } = await supabase
      .from('fishing_spots')
      .select('photo_path')
      .eq('id', spotId)
      .eq('user_id', userId)
      .maybeSingle()
    photoPath = data?.photo_path || ''
  }

  const { error } = await supabase
    .from('fishing_spots')
    .delete()
    .eq('id', spotId)
    .eq('user_id', userId)

  if (error) throw error

  let photoCleanupFailed = false
  if (photoPath) {
    try { await removeSpotPhoto(photoPath) } catch { photoCleanupFailed = true }
  }
  return { photoCleanupFailed }
}
