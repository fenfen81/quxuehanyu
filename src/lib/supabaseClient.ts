import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://yiicvtzauhzsszunwwms.supabase.co'
const supabaseAnonKey = 'sb_publishable_m10aNBh8N_Vn4dRgn4f3Uw_PaGUeg1l'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
