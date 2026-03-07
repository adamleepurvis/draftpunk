import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey || supabaseAnonKey === 'your_anon_key_here') {
  console.error(
    '[Draft Punk] Supabase credentials not configured.\n' +
    'Open .env and set VITE_SUPABASE_ANON_KEY to your project anon key.\n' +
    'Find it at: https://supabase.com/dashboard/project/ruhxfdtnxbaozmnbsmxv/settings/api'
  )
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '')
