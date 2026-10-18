'use server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { supabaseServer } from '@/lib/supabase/server';
import { sessionUser } from '@/lib/ctx';

export type Role = 'festival' | 'filmmaker' | 'judge';

/** Completes registration: saves the name and the chosen role, returns where to go next. */
export async function register(name: string, role: Role): Promise<{ ok: boolean; error?: string; to?: string }> {
  const user = await sessionUser();
  if (!user) return { ok: false, error: 'auth' };
  const n = name.trim().replace(/\s+/g, ' ');
  if (n.length < 2 || n.length > 80) return { ok: false, error: 'name' };
  if (!['festival', 'filmmaker', 'judge'].includes(role)) return { ok: false, error: 'role' };
  const sb = await supabaseServer();
  const { error } = await sb.from('profiles').update({ full_name: n, account_type: role }).eq('id', user.id);
  if (error) return { ok: false, error: 'failed' };
  await sb.auth.updateUser({ data: { full_name: n } }).catch(() => null);
  (await cookies()).delete('nas_role');
  revalidatePath('/', 'layout');
  if (role === 'filmmaker') return { ok: true, to: '/app/me' };
  if (role === 'judge') return { ok: true, to: '/review' };
  const { count } = await sb.from('festival_members').select('festival_id', { count: 'exact', head: true }).eq('user_id', user.id).neq('role', 'reviewer');
  return { ok: true, to: count ? '/app' : '/app/new' };
}
