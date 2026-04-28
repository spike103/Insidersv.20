import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'

// Hook Supabase Auth — expose la session et l'état d'auth
export function useAuth() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    // 1. Récupérer la session existante au mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      setSession(session)
      setLoading(false)
    })

    // 2. Souscrire aux changements de session (login/logout/refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      setSession(session)
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription?.unsubscribe()
    }
  }, [])

  return { session, user: session?.user || null, loading }
}
