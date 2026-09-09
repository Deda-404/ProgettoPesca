import { supabase } from './supabase'

function toAppGear(row) {
  return {
    id: row.id,
    category: row.category,
    brand: row.brand ?? '',
    model: row.model ?? '',
    specs: row.specs ?? '',
    notes: row.notes ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    synced: true,
  }
}

export async function loadRemoteGear(userId) {
  if (!supabase || !userId) return []

  const { data, error } = await supabase
    .from('gear')
    .select('id,category,brand,model,specs,notes,created_at,updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(250)

  if (error) throw error
  return (data ?? []).map(toAppGear)
}

export async function createRemoteGear(userId, item) {
  if (!supabase || !userId) throw new Error('Cloud XFish non disponibile.')

  const payload = {
    user_id: userId,
    category: item.category,
    brand: item.brand?.trim() || null,
    model: item.model?.trim() || null,
    specs: item.specs?.trim() || null,
    notes: item.notes?.trim() || null,
  }

  const { data, error } = await supabase
    .from('gear')
    .insert(payload)
    .select('id,category,brand,model,specs,notes,created_at,updated_at')
    .single()

  if (error) throw error
  return toAppGear(data)
}

export async function updateRemoteGear(userId, item) {
  if (!supabase || !userId) throw new Error('Cloud XFish non disponibile.')

  const payload = {
    category: item.category,
    brand: item.brand?.trim() || null,
    model: item.model?.trim() || null,
    specs: item.specs?.trim() || null,
    notes: item.notes?.trim() || null,
  }

  const { data, error } = await supabase
    .from('gear')
    .update(payload)
    .eq('id', item.id)
    .eq('user_id', userId)
    .select('id,category,brand,model,specs,notes,created_at,updated_at')
    .single()

  if (error) throw error
  return toAppGear(data)
}

export async function deleteRemoteGear(userId, gearId) {
  if (!supabase || !userId) throw new Error('Cloud XFish non disponibile.')

  const { error } = await supabase
    .from('gear')
    .delete()
    .eq('id', gearId)
    .eq('user_id', userId)

  if (error) throw error
}
