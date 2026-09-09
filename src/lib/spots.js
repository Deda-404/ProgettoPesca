import { supabase } from './supabase'

function mapSpot(row) {
  return {
    id: row.id,
    name: row.name,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    type: row.spot_type || 'altro',
    notes: row.notes || '',
    isPrivate: row.is_private !== false,
    createdAt: row.created_at,
    synced: true,
  }
}

export async function loadRemoteSpots(userId) {
  if (!supabase || !userId) return []

  const { data, error } = await supabase
    .from('fishing_spots')
    .select('id,name,latitude,longitude,spot_type,notes,is_private,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []).map(mapSpot)
}

export async function createRemoteSpot(userId, spot) {
  if (!supabase || !userId) throw new Error('Cloud XFish non disponibile.')

  const payload = {
    user_id: userId,
    name: spot.name.trim(),
    latitude: Number(spot.latitude),
    longitude: Number(spot.longitude),
    spot_type: spot.type || 'altro',
    notes: spot.notes?.trim() || null,
    is_private: spot.isPrivate !== false,
  }

  const { data, error } = await supabase
    .from('fishing_spots')
    .insert(payload)
    .select('id,name,latitude,longitude,spot_type,notes,is_private,created_at')
    .single()

  if (error) throw error
  return mapSpot(data)
}

export async function deleteRemoteSpot(userId, spotId) {
  if (!supabase || !userId) throw new Error('Cloud XFish non disponibile.')

  const { error } = await supabase
    .from('fishing_spots')
    .delete()
    .eq('id', spotId)
    .eq('user_id', userId)

  if (error) throw error
}
