import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

let serverSupabase: any = null
let hasWarnedOnFallback = false

function getServerSupabaseKey(): string | null {
  return supabaseServiceRoleKey || supabaseAnonKey || null
}

export function hasServerSupabaseClient(): boolean {
  return Boolean(supabaseUrl && getServerSupabaseKey())
}

export function getServerSupabaseClient(): any {
  if (!supabaseUrl) {
    throw new Error('missing NEXT_PUBLIC_SUPABASE_URL')
  }

  const key = getServerSupabaseKey()
  if (!key) {
    throw new Error('missing SUPABASE_SERVICE_ROLE_KEY')
  }

  if (!supabaseServiceRoleKey && !hasWarnedOnFallback) {
    console.warn(
      '[supabase-server] SUPABASE_SERVICE_ROLE_KEY is not set; falling back to the anon key. Sensitive routes may still depend on RLS.',
    )
    hasWarnedOnFallback = true
  }

  if (!serverSupabase) {
    serverSupabase = createClient(supabaseUrl, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }

  return serverSupabase
}
