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

const catchFields = 'id, species, caught_at, weight_kg, length_cm, lure, notes, photo_url, spot_id, latitude, longitude, location_label'
const catchSelect = `${catchFields}, catch_gear(gear_id)`

function payloadForCatch(item, photoPath) {
  const hasCoordinates = Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude))
  return {
    species: item.species,
    caught_at: item.caughtAt || new Date().toISOString(),
    weight_kg: item.weight ? Number(item.weight) : null,
    length_cm: item.length ? Number(item.length) : null,
    lure: item.lure || null,
    notes: item.notes || null,
    photo_url: photoPath || null,
    spot_id: item.spotId || null,
    latitude: hasCoordinates ? Number(item.latitude) : null,
    longitude: hasCoordinates ? Number(item.longitude) : null,
    location_label: item.locationLabel?.trim() || null,
  }
}

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

  const gearIds = [...new Set((item.gearIds ?? []).filter(Boolean))]
  let insertedId = null
  let uploadedPath = ''

  const payload = {
    id: item.id || undefined,
    user_id: userId,
    ...payloadForCatch(item, null),
  }

  try {
    const { data, error } = await supabase
      .from('catches')
      .insert(payload)
      .select(catchFields)
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

export async function updateRemoteCatch(userId, item) {
  if (!supabase || !userId || !item?.id) throw new Error('Cattura non valida o cloud non disponibile.')

  const { data: previousRow, error: previousError } = await supabase
    .from('catches')
    .select(catchFields)
    .eq('id', item.id)
    .eq('user_id', userId)
    .single()
  if (previousError) throw previousError

  const { data: previousLinks, error: previousLinksError } = await supabase
    .from('catch_gear')
    .select('gear_id')
    .eq('catch_id', item.id)
  if (previousLinksError) throw previousLinksError

  const previousGearIds = [...new Set((previousLinks ?? []).map((link) => link.gear_id).filter(Boolean))]
  const gearIds = [...new Set((item.gearIds ?? []).filter(Boolean))]
  const previousPhotoPath = previousRow.photo_url || ''
  let nextPhotoPath = item.removePhoto ? '' : previousPhotoPath
  let uploadedPath = ''
  let rowUpdated = false
  let linksTouched = false

  try {
    if (item.photoBlob) {
      uploadedPath = await uploadCatchPhoto(userId, item.id, item.photoBlob, `edit-${Date.now()}`)
      nextPhotoPath = uploadedPath
    }

    const { data, error } = await supabase
      .from('catches')
      .update(payloadForCatch(item, nextPhotoPath))
      .eq('id', item.id)
      .eq('user_id', userId)
      .select(catchFields)
      .single()
    if (error) throw error
    rowUpdated = true

    const { error: deleteLinksError } = await supabase
      .from('catch_gear')
      .delete()
      .eq('catch_id', item.id)
    if (deleteLinksError) throw deleteLinksError
    linksTouched = true

    if (gearIds.length) {
      const { error: insertLinksError } = await supabase
        .from('catch_gear')
        .insert(gearIds.map((gearId) => ({ catch_id: item.id, gear_id: gearId })))
      if (insertLinksError) throw insertLinksError
    }

    let signedPhotoUrl = ''
    if (nextPhotoPath) {
      try { signedPhotoUrl = await signCatchPhotoPath(nextPhotoPath) } catch { /* firma best effort */ }
    }

    let photoCleanupPending = false
    if (previousPhotoPath && previousPhotoPath !== nextPhotoPath) {
      try { await removeCatchPhoto(previousPhotoPath) } catch { photoCleanupPending = true }
    }

    return {
      ...toAppCatch({
        ...data,
        photoUrl: signedPhotoUrl,
        catch_gear: gearIds.map((gearId) => ({ gear_id: gearId })),
      }),
      photoCleanupPending,
    }
  } catch (error) {
    if (linksTouched) {
      try {
        await supabase.from('catch_gear').delete().eq('catch_id', item.id)
        if (previousGearIds.length) {
          await supabase.from('catch_gear').insert(previousGearIds.map((gearId) => ({ catch_id: item.id, gear_id: gearId })))
        }
      } catch {
        // Rollback best-effort: il successivo reload cloud riallinea lo stato visibile.
      }
    }

    if (rowUpdated) {
      try {
        await supabase
          .from('catches')
          .update({
            species: previousRow.species,
            caught_at: previousRow.caught_at,
            weight_kg: previousRow.weight_kg,
            length_cm: previousRow.length_cm,
            lure: previousRow.lure,
            notes: previousRow.notes,
            photo_url: previousRow.photo_url,
            spot_id: previousRow.spot_id,
            latitude: previousRow.latitude,
            longitude: previousRow.longitude,
            location_label: previousRow.location_label,
          })
          .eq('id', item.id)
          .eq('user_id', userId)
      } catch {
        // Rollback best-effort.
      }
    }

    if (uploadedPath) {
      try { await removeCatchPhoto(uploadedPath) } catch { /* best effort rollback */ }
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
