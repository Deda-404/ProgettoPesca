import { removeCatchPhoto, signCatchPhotoPath, signCatchPhotoPaths, uploadCatchPhoto } from './photos'
import { supabase } from './supabase'

function toAppCatch(row) {
  return {
    id: row.id,
    species: row.species,
    caughtAt: row.caught_at,
    weight: row.weight_kg ?? '',
    length: row.length_cm ?? '',
    lure: row.lure ?? '',
    notes: row.notes ?? '',
    photoPath: row.photo_url ?? '',
    photoUrl: row.photoUrl ?? '',
    spotId: row.spot_id ?? null,
    latitude: row.latitude == null ? null : Number(row.latitude),
    longitude: row.longitude == null ? null : Number(row.longitude),
    locationLabel: row.location_label ?? '',
    gearIds: (row.catch_gear ?? []).map((link) => link.gear_id).filter(Boolean),
    synced: true,
  }
}

const catchSelect = 'id, species, caught_at, weight_kg, length_cm, lure, notes, photo_url, spot_id, latitude, longitude, location_label, catch_gear(gear_id)'

async function attachSignedPhotos(items) {
  const paths = items.map((item) => item.photoPath).filter(Boolean)
  if (!paths.length) return items

  try {
    const signed = await signCatchPhotoPaths(paths)
    return items.map((item) => ({
      ...item,
      photoUrl: item.photoPath ? signed.get(item.photoPath) || '' : '',
    }))
  } catch {
    // Il diario resta utilizzabile anche se una URL firmata non viene generata.
    return items
  }
}

export async function loadRemoteCatches(userId) {
  if (!supabase || !userId) return []

  const { data, error } = await supabase
    .from('catches')
    .select(catchSelect)
    .eq('user_id', userId)
    .order('caught_at', { ascending: false })
    .limit(250)

  if (error) throw error
  return attachSignedPhotos((data ?? []).map(toAppCatch))
}

export async function createRemoteCatch(userId, item) {
  if (!supabase || !userId) throw new Error('Supabase non configurato o utente non autenticato.')

  const hasCoordinates = Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude))
  const gearIds = [...new Set((item.gearIds ?? []).filter(Boolean))]
  let insertedId = null
  let uploadedPath = ''

  const payload = {
    id: item.id || undefined,
    user_id: userId,
    species: item.species,
    caught_at: item.caughtAt || new Date().toISOString(),
    weight_kg: item.weight ? Number(item.weight) : null,
    length_cm: item.length ? Number(item.length) : null,
    lure: item.lure || null,
    notes: item.notes || null,
    photo_url: null,
    spot_id: item.spotId || null,
    latitude: hasCoordinates ? Number(item.latitude) : null,
    longitude: hasCoordinates ? Number(item.longitude) : null,
    location_label: item.locationLabel?.trim() || null,
  }

  try {
    const { data, error } = await supabase
      .from('catches')
      .insert(payload)
      .select('id, species, caught_at, weight_kg, length_cm, lure, notes, photo_url, spot_id, latitude, longitude, location_label')
      .single()

    if (error) throw error
    insertedId = data.id

    if (gearIds.length) {
      const { error: linkError } = await supabase
        .from('catch_gear')
        .insert(gearIds.map((gearId) => ({ catch_id: data.id, gear_id: gearId })))
      if (linkError) throw linkError
    }

    let signedPhotoUrl = ''
    if (item.photoBlob) {
      uploadedPath = await uploadCatchPhoto(userId, data.id, item.photoBlob)
      const { error: photoUpdateError } = await supabase
        .from('catches')
        .update({ photo_url: uploadedPath })
        .eq('id', data.id)
        .eq('user_id', userId)
      if (photoUpdateError) throw photoUpdateError
      data.photo_url = uploadedPath

      try {
        signedPhotoUrl = await signCatchPhotoPath(uploadedPath)
      } catch {
        signedPhotoUrl = ''
      }
    }

    return toAppCatch({
      ...data,
      photoUrl: signedPhotoUrl,
      catch_gear: gearIds.map((gearId) => ({ gear_id: gearId })),
    })
  } catch (error) {
    if (uploadedPath) {
      try { await removeCatchPhoto(uploadedPath) } catch { /* best effort rollback */ }
    }
    if (insertedId) {
      await supabase.from('catches').delete().eq('id', insertedId).eq('user_id', userId)
    }
    throw error
  }
}

export async function deleteRemoteCatch(userId, item) {
  if (!supabase || !userId || !item?.id) throw new Error('Cattura non valida o cloud non disponibile.')

  const { error } = await supabase
    .from('catches')
    .delete()
    .eq('id', item.id)
    .eq('user_id', userId)

  if (error) throw error

  if (item.photoPath) {
    try {
      await removeCatchPhoto(item.photoPath)
    } catch {
      return { photoCleanupFailed: true }
    }
  }

  return { photoCleanupFailed: false }
}
