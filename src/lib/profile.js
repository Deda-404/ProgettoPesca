import { compressCatchPhoto } from './photos'
import { supabase } from './supabase'

const PROFILE_BUCKET = 'profile-photos'
const SIGNED_URL_SECONDS = 6 * 60 * 60

function mapProfile(row, avatarUrl = '') {
  return {
    id: row.id,
    displayName: row.display_name || '',
    avatarPath: row.avatar_url || '',
    avatarUrl,
    isAdmin: row.is_admin === true,
    lastSeenAt: row.last_seen_at || null,
    deletionRequestedAt: row.deletion_requested_at || null,
  }
}

async function signAvatar(path) {
  if (!supabase || !path) return ''
  const { data, error } = await supabase.storage.from(PROFILE_BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS)
  if (error) throw error
  return data?.signedUrl || ''
}

export async function loadProfile(userId) {
  if (!supabase || !userId) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('id,display_name,avatar_url,is_admin,last_seen_at,deletion_requested_at')
    .eq('id', userId)
    .single()
  if (error) throw error
  let avatarUrl = ''
  if (data.avatar_url) {
    try { avatarUrl = await signAvatar(data.avatar_url) } catch { /* profile still usable */ }
  }
  return mapProfile(data, avatarUrl)
}

export async function updateDisplayName(userId, displayName) {
  if (!supabase || !userId) throw new Error('Profilo cloud non disponibile.')
  const cleanName = displayName?.trim()
  if (!cleanName) throw new Error('Inserisci un nome utente.')
  const { data, error } = await supabase
    .from('profiles')
    .update({ display_name: cleanName })
    .eq('id', userId)
    .select('id,display_name,avatar_url,is_admin,last_seen_at,deletion_requested_at')
    .single()
  if (error) throw error
  const { error: authError } = await supabase.auth.updateUser({ data: { display_name: cleanName } })
  if (authError) throw authError
  let avatarUrl = ''
  if (data.avatar_url) {
    try { avatarUrl = await signAvatar(data.avatar_url) } catch { /* no-op */ }
  }
  return mapProfile(data, avatarUrl)
}

export async function replaceProfilePhoto(userId, file) {
  if (!supabase || !userId || !file) throw new Error('Foto profilo non disponibile.')
  const compressed = await compressCatchPhoto(file)
  const extension = compressed.blob.type === 'image/jpeg' ? 'jpg' : 'webp'
  const path = `${userId}/avatar-${crypto.randomUUID()}.${extension}`

  const { data: current, error: currentError } = await supabase.from('profiles').select('avatar_url').eq('id', userId).single()
  if (currentError) throw currentError

  const { error: uploadError } = await supabase.storage.from(PROFILE_BUCKET).upload(path, compressed.blob, {
    contentType: compressed.blob.type || 'image/webp',
    cacheControl: '31536000',
    upsert: false,
  })
  if (uploadError) throw uploadError

  try {
    const { error: updateError } = await supabase.from('profiles').update({ avatar_url: path }).eq('id', userId)
    if (updateError) throw updateError
    if (current?.avatar_url && current.avatar_url !== path) {
      try { await supabase.storage.from(PROFILE_BUCKET).remove([current.avatar_url]) } catch { /* cleanup best effort */ }
    }
    return { avatarPath: path, avatarUrl: await signAvatar(path), bytes: compressed.compressedBytes }
  } catch (error) {
    try { await supabase.storage.from(PROFILE_BUCKET).remove([path]) } catch { /* rollback best effort */ }
    throw error
  }
}

export async function removeProfilePhoto(userId) {
  if (!supabase || !userId) throw new Error('Profilo cloud non disponibile.')
  const { data, error } = await supabase.from('profiles').select('avatar_url').eq('id', userId).single()
  if (error) throw error
  const path = data?.avatar_url || ''
  const { error: updateError } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', userId)
  if (updateError) throw updateError
  if (path) {
    const { error: removeError } = await supabase.storage.from(PROFILE_BUCKET).remove([path])
    if (removeError) throw removeError
  }
}

export async function loadPhotoStorageBytes() {
  if (!supabase) return 0
  const { data, error } = await supabase.rpc('my_photo_storage_bytes')
  if (error) throw error
  return Number(data) || 0
}

export async function touchLastSeen(userId) {
  if (!supabase || !userId) return
  await supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', userId)
}

export async function requestAccountDeletion(userId) {
  if (!supabase || !userId) throw new Error('Profilo cloud non disponibile.')
  const requestedAt = new Date().toISOString()
  const { error } = await supabase.from('profiles').update({ deletion_requested_at: requestedAt }).eq('id', userId)
  if (error) throw error
  return requestedAt
}

export async function cancelAccountDeletion(userId) {
  if (!supabase || !userId) throw new Error('Profilo cloud non disponibile.')
  const { error } = await supabase.from('profiles').update({ deletion_requested_at: null }).eq('id', userId)
  if (error) throw error
}

export async function loadAdminMembers() {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('profiles')
    .select('id,display_name,is_admin,last_seen_at,deletion_requested_at')
    .order('last_seen_at', { ascending: false, nullsFirst: false })
    .limit(250)
  if (error) throw error
  return data ?? []
}
