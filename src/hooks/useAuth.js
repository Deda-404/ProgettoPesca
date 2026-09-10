import { useEffect, useState } from 'react'
import { supabase, supabaseConfigured } from '../lib/supabase'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(supabaseConfigured)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return undefined
    }

    let mounted = true

    const loadUser = async () => {
      const { data, error } = await supabase.auth.getUser()
      if (!mounted) return
      if (!error) setUser(data.user ?? null)
      setLoading(false)
    }

    loadUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!supabase || !user?.id) return undefined

    const touchPresence = () => {
      supabase
        .from('profiles')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', user.id)
        .then(() => {})
    }

    touchPresence()
    const interval = window.setInterval(touchPresence, 4 * 60 * 1000)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') touchPresence()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [user?.id])

  return { user, loading }
}
