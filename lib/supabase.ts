import { createServerClient } from '@supabase/ssr';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() { return store.getAll(); },
      setAll(items) { try { items.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* Server Components are read-only; proxy refreshes tokens */ } }
    }
  });
}
export function supabaseAdmin() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  // If service key is missing, empty, or has placeholder bullet characters, fall back to anon key
  const validServiceKey = serviceKey && !serviceKey.includes('•') && serviceKey.trim().length > 20
    ? serviceKey.trim()
    : null;
  const key = validServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}
export async function getUser() {
  const supabase = await supabaseServer();
  const { data: { user }, error } = await supabase.auth.getUser();
  return error ? null : user;
}
