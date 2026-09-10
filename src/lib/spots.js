import { removeSpotPhoto, signSpotPhotoPaths, uploadSpotPhoto } from './spotPhotos'
import { supabase } from './supabase'

function mapSpot(row, signedUrls = new Map()) {
  const visibility = row.visibility || (row.is_private === false ? 'global' : 'private')
  return {
    id: row.id,
    ownerId: row.user_id || '',
    name: row.name,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    type: row.spot_type || 'altro',
    notes: row.notes || '',
    visibility,
    groupId: row.group_id || '',
    isPrivate: visibility === 'private',
    photoPath: row.photo_path || '',
    photoUrl: row.photo_path ? (signedUrls.get(row.photo_path) || '') : '',
    photoLocalKey: '',
    createdAt: row.created_at,
    synced: true,
  }
}

const spotSelect = 'id,user_id,name,latitude,longitude,spot_type,notes,is_private,visibility,group_id,photo_path,created_at'

async function mapRowsWithPhotos(rows) {
  let signedUrls = new Map()
  try { signedUrls = await signSpotPhotoPaths(rows.map((row) => row.photo_path)) } catch { /* visible without photo */ }
  return rows.map((row) => mapSpot(row, signedUrls))
}

export async function loadRemoteSpots(userId) {
  if (!supabase || !userId) return []
  const { data, error } = await supabase.from('fishing_spots').select(spotSelect).eq('user_id', userId).order('created_at', { ascending: false }).limit(250)
  if (error) throw error
  return mapRowsWithPhotos(data || [])
}

export async function loadRemoteSpotsByScope(userId, scope = 'private', groupId = '') {
  if (!supabase || !userId) return []
  let query = supabase.from('fishing_spots').select(spotSelect).order('created_at', { ascending: false }).limit(250)
  if (scope === 'global') query = query.eq('visibility', 'global')
  else if (scope === 'group' && groupId) query = query.eq('visibility', 'group').eq('group_id', groupId)
  else query = query.eq('user_id', userId)
  const { data, error } = await query
  if (error) throw error
  return mapRowsWithPhotos(data || [])
}

function spotPayload(spot, photoPath) {
  const visibility = ['private', 'global', 'group'].includes(spot.visibility)
    ? spot.visibility
    : (spot.isPrivate === false ? 'global' : 'private')
  return {
    name: spot.name.trim(),
    latitude: Number(spot.latitude),
    longitude: Number(spot.longitude),
    spot_type: spot.type || 'altro',
    notes: spot.notes?.trim() || null,
    is_private: visibility === 'private',
    visibility,
    group_id: visibility === 'group' ? (spot.groupId || null) : null,
    photo_path: photoPath || null,
  }
}

export async function createRemoteSpot(userId, spot) {
  if (!supabase || !userId) throw new Error('Cloud XFish non disponibile.')
  const spotId = spot.id || crypto.randomUUID()
  let photoPath = ''
  try {
    if (spot.photoBlob) photoPath = await uploadSpotPhoto(userId, spotId, spot.photoBlob)
    const { data, error } = await supabase.from('fishing_spots').insert({ id: spotId, user_id: userId, ...spotPayload(spot, photoPath) }).select(spotSelect).single()
    if (error) throw error
    let signedUrls = new Map()
    if (photoPath) { try { signedUrls = await signSpotPhotoPaths([photoPath]) } catch { /* no-op */ } }
    return mapSpot(data, signedUrls)
  } catch (error) {
    if (photoPath) { try { await removeSpotPhoto(photoPath) } catch { /* best effort */ } }
    throw error
  }
}

export async function updateRemoteSpot(userId, spot) {
  if (!supabase || !userId || !spot?.id) throw new Error('Spot non valido o cloud non disponibile.')
  const previousPhotoPath = spot.photoPath || ''
  let nextPhotoPath = spot.removePhoto ? '' : previousPhotoPath
  let uploadedPhotoPath = ''
  try {
    if (spot.photoBlob) {
      uploadedPhotoPath = await uploadSpotPhoto(userId, spot.id, spot.photoBlob, { versioned: true })
      nextPhotoPath = uploadedPhotoPath
    }
    const { data, error } = await supabase.from('fishing_spots').update(spotPayload(spot, nextPhotoPath)).eq('id', spot.id).eq('user_id', userId).select(spotSelect).single()
    if (error) throw error
    let signedUrls = new Map()
    if (nextPhotoPath) { try { signedUrls = await signSpotPhotoPaths([nextPhotoPath]) } catch { /* no-op */ } }
    const saved = mapSpot(data, signedUrls)
    if (previousPhotoPath && previousPhotoPath !== nextPhotoPath) {
      try { await removeSpotPhoto(previousPhotoPath) } catch { return { ...saved, photoCleanupPending: true } }
    }
    return saved
  } catch (error) {
    if (uploadedPhotoPath) { try { await removeSpotPhoto(uploadedPhotoPath) } catch { /* best effort */ } }
    throw error
  }
}

export async function deleteRemoteSpot(userId, spotOrId) {
  if (!supabase || !userId) throw new Error('Cloud XFish non disponibile.')
  const spotId = typeof spotOrId === 'string' ? spotOrId : spotOrId?.id
  if (!spotId) throw new Error('Spot non valido.')
  let photoPath = typeof spotOrId === 'object' ? (spotOrId.photoPath || '') : ''
  if (!photoPath) {
    const { data } = await supabase.from('fishing_spots').select('photo_path').eq('id', spotId).eq('user_id', userId).maybeSingle()
    photoPath = data?.photo_path || ''
  }
  const { error } = await supabase.from('fishing_spots').delete().eq('id', spotId).eq('user_id', userId)
  if (error) throw error
  let photoCleanupFailed = false
  if (photoPath) { try { await removeSpotPhoto(photoPath) } catch { photoCleanupFailed = true } }
  return { photoCleanupFailed }
}

export async function loadFavoriteSpotIds(userId) {
  if (!supabase || !userId) return []
  const { data, error } = await supabase.from('spot_favorites').select('spot_id').eq('user_id', userId)
  if (error) throw error
  return (data ?? []).map((row) => row.spot_id)
}

export async function setSpotFavorite(userId, spotId, favorite) {
  if (!supabase || !userId || !spotId) throw new Error('Preferito non valido.')
  const query = favorite
    ? supabase.from('spot_favorites').insert({ user_id: userId, spot_id: spotId })
    : supabase.from('spot_favorites').delete().eq('user_id', userId).eq('spot_id', spotId)
  const { error } = await query
  if (error && error.code !== '23505') throw error
}
