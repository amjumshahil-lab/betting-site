// ========================================
// Supabase Client (Browser-Safe)
// Only the public URL and public key go here.
// NEVER put your secret key (sb_secret_...) in this file.
// ========================================

const SUPABASE_URL = 'https://taghffstxiwfcoypqeny.supabase.co';
const SUPABASE_PUBLIC_KEY = 'sb_publishable_xyErxo_jJBQGDTU6LQDajg_2Ozkl23Y';

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);
window.supabase = supabase;
