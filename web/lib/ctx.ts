import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabaseServer } from './supabase/server';

export type Festival = {
  id: string; name: string; slug: string; status: string; visibility: string; edition: number; city: string | null; country: string | null; description: string | null;
  submissions_open: string | null; submissions_close: string | null; review_deadline: string | null; results_on: string | null; fee_note: string | null; rules: string[];
};
export type Membership = { role: string; festival: Festival };

export async function getCtx() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/login');
  await sb.rpc('accept_my_invites');
  const [{ data: profile }, { data: mems }] = await Promise.all([
    sb.from('profiles').select('id,full_name,email,is_admin').eq('id', user.id).maybeSingle(),
    sb.from('festival_members').select('role, festival:festivals(*)').eq('user_id', user.id),
  ]);
  const memberships = ((mems || []) as unknown as Membership[]).filter((m) => m.festival).sort((a, b) => (a.festival.name > b.festival.name ? 1 : -1));
  const store = await cookies();
  const wanted = store.get('nas_fid')?.value;
  const current = memberships.find((m) => m.festival.id === wanted) || memberships.find((m) => m.role !== 'reviewer') || memberships[0] || null;
  const name = profile?.full_name || (user.user_metadata?.full_name as string) || user.email?.split('@')[0] || '';
  return { sb, user, profile, isAdmin: !!profile?.is_admin, memberships, current, name };
}

export async function requireStaff() {
  const ctx = await getCtx();
  if (!ctx.current) redirect(ctx.isAdmin ? '/app/admin' : '/app/new');
  if (ctx.current.role === 'reviewer') redirect('/review');
  return { ...ctx, festival: ctx.current.festival, role: ctx.current.role };
}

export async function log(sb: Awaited<ReturnType<typeof supabaseServer>>, festival_id: string, actor_id: string, actor_label: string, action: string, target: string) {
  await sb.from('audit_log').insert({ festival_id, actor_id, actor_label, action, target });
}
