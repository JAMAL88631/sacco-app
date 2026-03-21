import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qgvnjjgrwqhaonzoipxq.supabase.co'
const supabaseAnonKey = 'sb_publishable_dCxpfTDMRO0AiRsQ5m-v7w_04CnGRYh'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)