import { supabase } from './supabase'

function mapSetup(row) {
  return {
    id: row.id,
    name: row.name,
    rodId: row.rod_id || '',
    reelId: row.reel_id || '',
    mainLineId: row.main_line_id || '',
    leaderId: row.leader_id || '',
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

const fields = 'id,name,rod_id,reel_id,main_line_id,leader_id,notes,created_at,updated_at'

export async function loadRemoteSetups(userId) {
  if (!supabase || !userId) return []
  const { data, error } = await supabase.from('gear_setups').select(fields).eq('user_id', userId).order('updated_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(mapSetup)
}

export async function saveRemoteSetup(userId, item) {
  if (!supabase || !userId) throw new Error('Cloud montature non disponibile.')
  const payload = {
    user_id: userId,
    name: item.name.trim(),
    rod_id: item.rodId || null,
    reel_id: item.reelId || null,
    main_line_id: item.mainLineId || null,
    leader_id: item.leaderId || null,
    notes: item.notes?.trim() || null,
  }
  const query = item.id
    ? supabase.from('gear_setups').update(payload).eq('id', item.id).eq('user_id', userId)
    : supabase.from('gear_setups').insert(payload)
  const { data, error } = await query.select(fields).single()
  if (error) throw error
  return mapSetup(data)
}

export async function deleteRemoteSetup(userId, setupId) {
  if (!supabase || !userId || !setupId) throw new Error('Montatura non valida.')
  const { error } = await supabase.from('gear_setups').delete().eq('id', setupId).eq('user_id', userId)
  if (error) throw error
}
