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
    photoUrl: row.photo_url ?? '',
    spotId: row.spot_id ?? null,
    latitude: row.latitude == null ? null : Number(row.latitude),
    longitude: row.longitude == null ? null : Number(row.longitude),
    locationLabel: row.location_label ?? '',
    gearIds: (row.catch_gear ?? []).map((link) => link.gear_id).filter(Boolean),
    synced: true,
  }
}

const catchSelect = 'id, species, caught_at, weight_kg, length_cm, lure, notes, photo_url, spot_id, latitude, longitude, location_label, catch_gear(gear_id)'

export async function loadRemoteCatches(userId) {
  if (!supabase || !userId) return []

  const { data, error } = await supabase
    .from('catches')
    .select(catchSelect)
    .eq('user_id', userId)
    .order('caught_at', { ascending: false })
    .limit(250)

  if (error) throw error
  return (data ?? []).map(toAppCatch)
}

export async function createRemoteCatch(userId, item) {
  if (!supabase || !userId) throw new Error('Supabase non configurato o utente non autenticato.')

  const hasCoordinates = Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude))
  const gearIds = [...new Set((item.gearIds ?? []).filter(Boolean))]

  const payload = {
    user_id: userId,
    species: item.species,
    caught_at: item.caughtAt || new Date().toISOString(),
    weight_kg: item.weight ? Number(item.weight) : null,
    length_cm: item.length ? Number(item.length) : null,
    lure: item.lure || null,
    notes: item.notes || null,
    photo_url: item.photoUrl || null,
    spot_id: item.spotId || null,
    latitude: hasCoordinates ? Number(item.latitude) : null,
    longitude: hasCoordinates ? Number(item.longitude) : null,
    location_label: item.locationLabel?.trim() || null,
  }

  const { data, error } = await supabase
    .from('catches')
    .insert(payload)
    .select('id, species, caught_at, weight_kg, length_cm, lure, notes, photo_url, spot_id, latitude, longitude, location_label')
    .single()

  if (error) throw error

  if (gearIds.length) {
    const { error: linkError } = await supabase
      .from('catch_gear')
      .insert(gearIds.map((gearId) => ({ catch_id: data.id, gear_id: gearId })))

    if (linkError) {
      await supabase.from('catches').delete().eq('id', data.id).eq('user_id', userId)
      throw linkError
    }
  }

  return toAppCatch({
    ...data,
    catch_gear: gearIds.map((gearId) => ({ gear_id: gearId })),
  })
}
