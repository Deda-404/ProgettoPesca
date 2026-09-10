import { supabase } from './supabase'

function mapGroup(row) {
  return {
    id: row.id,
    name: row.name,
    ownerId: row.owner_id,
    createdAt: row.created_at,
  }
}

export async function loadMyGroups(userId) {
  if (!supabase || !userId) return []
  const { data, error } = await supabase
    .from('fishing_groups')
    .select('id,name,owner_id,created_at')
    .order('name', { ascending: true })
  if (error) throw error
  return (data ?? []).map(mapGroup)
}

export async function createGroup(userId, name) {
  if (!supabase || !userId) throw new Error('Cloud gruppi non disponibile.')
  const cleanName = name?.trim()
  if (!cleanName) throw new Error('Inserisci un nome per il gruppo.')
  const { data, error } = await supabase
    .from('fishing_groups')
    .insert({ owner_id: userId, name: cleanName })
    .select('id,name,owner_id,created_at')
    .single()
  if (error) throw error
  return mapGroup(data)
}

export async function deleteGroup(userId, groupId) {
  if (!supabase || !userId || !groupId) throw new Error('Gruppo non valido.')
  const { error } = await supabase
    .from('fishing_groups')
    .delete()
    .eq('id', groupId)
    .eq('owner_id', userId)
  if (error) throw error
}
