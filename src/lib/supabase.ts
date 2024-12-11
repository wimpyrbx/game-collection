import { createClient } from '@supabase/supabase-js'

export type MiniType = {
  id: number
  name: string
  category_count?: number
}

export type MiniCategory = {
  id: number
  name: string
}

export type TypeToCategory = {
  type_id: number
  category_id: number
}

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
)
