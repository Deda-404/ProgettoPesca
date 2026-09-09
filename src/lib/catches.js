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
    synced: true,
  }
}

export async function loadRemoteCatches(userId) {
  if (!supabase || !userId) return []

  const { data, error } = await supabase
    .from('catches')
    .select('id, species, caught_at, weight_kg, length_cm, lure, notes, photo_url, spot_id')
    .eq('user_id', userId)
    .order('caught_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map(toAppCatch)
}

export async function createRemoteCatch(userId, item) {
  if (!supabase || !userId) throw new Error('Supabase non configurato o utente non autenticato.')

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
  }

  const { data, error } = await supabase
    .from('catches')
    .insert(payload)
    .select('id, species, caught_at, weight_kg, length_cm, lure, notes, photo_url, spot_id')
    .single()

  if (error) throw error
  return toAppCatch(data)
}
