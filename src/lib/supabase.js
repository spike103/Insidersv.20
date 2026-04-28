import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    '[Supabase] Missing env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Netlify environment variables, then redeploy.'
  )
}

export const supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // permet le retour magic link
    flowType: 'pkce', // PKCE pour la sécu mobile/web
  },
})

// Helper : vérifier que la config est bonne
export const isSupabaseConfigured = !!(SUPABASE_URL && SUPABASE_ANON_KEY)
