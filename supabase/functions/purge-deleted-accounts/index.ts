import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.57.4'

// The plaintext cron secret lives only in Supabase Vault. The function stores
// only its SHA-256 digest, so no credential is committed to the repository.
const EXPECTED_SECRET_HASH = '8748c9f63436eb46e175a7eb8b9b06127bf60db46cd6ec5975a16bfa432c412f'
const BUCKETS = ['catch-photos', 'spot-photos', 'profile-photos']

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function removeUserFiles(client: ReturnType<typeof createClient>, userId: string) {
  for (const bucket of BUCKETS) {
    const { data, error } = await client.storage.from(bucket).list(userId, { limit: 1000 })
    if (error) throw error
    const paths = (data ?? [])
      .filter((item) => item.name && item.name !== '.emptyFolderPlaceholder')
      .map((item) => `${userId}/${item.name}`)
    if (paths.length) {
      const { error: removeError } = await client.storage.from(bucket).remove(paths)
      if (removeError) throw removeError
    }
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const supplied = req.headers.get('x-xfish-cron-secret') || ''
  if (!supplied || await sha256(supplied) !== EXPECTED_SECRET_HASH) {
    return new Response('Unauthorized', { status: 401 })
  }

  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceKey) return new Response('Server configuration missing', { status: 500 })

  const client = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: profiles, error } = await client
    .from('profiles')
    .select('id,deletion_requested_at')
    .not('deletion_requested_at', 'is', null)
    .lte('deletion_requested_at', cutoff)
    .limit(100)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }

  const deleted: string[] = []
  const failed: Array<{ id: string; error: string }> = []
  for (const profile of profiles ?? []) {
    try {
      await removeUserFiles(client, profile.id)
      const { error: deleteError } = await client.auth.admin.deleteUser(profile.id)
      if (deleteError) throw deleteError
      deleted.push(profile.id)
    } catch (error) {
      failed.push({ id: profile.id, error: error instanceof Error ? error.message : 'unknown error' })
    }
  }

  return new Response(JSON.stringify({ processed: (profiles ?? []).length, deleted: deleted.length, failed }), {
    headers: { 'content-type': 'application/json' },
  })
})
