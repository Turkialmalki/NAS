import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabaseServer } from './supabase/server';

export type Festival = {
  id: string; name: string; slug: string; status: string; visibility: string; edition: number; city: string | null; country: string | null; description: string | null;
  submissions_open: string | null; submissions_close: string | null; review_deadline: string | null; results_on: string | null; fee_note: string | null; rules: string[]; starts_on?: string | null; ends_on?: string | null; programme_published?: boolean;
};
export type Membership = { role: string; festival: Festival };

export type SessionUser = { id: string; email: string | undefined; user_metadata: Record<string, unknown> };

/** The signed-in user, read from the verified session token (no extra request in most cases). */
export const sessionUser = cache(async (): Promise<SessionUser | null> => {
  const sb = await supabaseServer();
  const { data } = await sb.auth.getClaims();
  const c = data?.claims;
  if (!c?.sub) return null;
  return { id: c.sub, email: (c.email as string) || undefined, user_metadata: (c.user_metadata as Record<string, unknown>) || {} };
});

/** Loaded once per request and shared by the layout and the page. */
export const getCtx = cache(async () => {
  const sb = await supabaseServer();
  const user = await sessionUser();
  if (!user) redirect('/login');
  const [, { data: profile }, { data: mems }] = await Promise.all([
    sb.rpc('accept_my_invites'),
    sb.from('profiles').select('id,full_name,email,is_admin,account_type').eq('id', user.id).maybeSingle(),
    sb.from('festival_members').select('role, festival:festivals(*)').eq('user_id', user.id),
  ]);
  const memberships = ((mems || []) as unknown as Membership[]).filter((m) => m.festival).sort((a, b) => (a.festival.name > b.festival.name ? 1 : -1));
  const store = await cookies();
  const wanted = store.get('nas_fid')?.value;
  const current = memberships.find((m) => m.festival.id === wanted && m.role !== 'reviewer') || memberships.find((m) => m.role !== 'reviewer') || memberships.find((m) => m.festival.id === wanted) || memberships[0] || null;
  const name = profile?.full_name || (user.user_metadata?.full_name as string) || user.email?.split('@')[0] || '';
  const accountType = (profile?.account_type as 'filmmaker' | 'festival' | null) || null;
  return { sb, user, profile, isAdmin: !!profile?.is_admin, memberships, current, name, accountType };
});

export async function requireStaff() {
  const ctx = await getCtx();
  if (!ctx.current) redirect(homeFor(ctx));
  if (ctx.current.role === 'reviewer') redirect('/review');
  return { ...ctx, festival: ctx.current.festival, role: ctx.current.role };
}

export async function log(sb: Awaited<ReturnType<typeof supabaseServer>>, festival_id: string, actor_id: string, actor_label: string, action: string, target: string) {
  await sb.from('audit_log').insert({ festival_id, actor_id, actor_label, action, target });
}

/** Where a signed-in user belongs when they have no festival workspace selected. */
export function homeFor(ctx: { accountType: string | null; memberships: Membership[]; isAdmin: boolean }) {
  if (ctx.memberships.some((m) => m.role !== 'reviewer')) return '/app';
  if (ctx.accountType === 'filmmaker') return '/app/me';
  if (ctx.memberships.some((m) => m.role === 'reviewer')) return '/review';
  if (ctx.isAdmin) return '/app/admin';
  if (ctx.accountType === 'festival') return '/app/new';
  return '/app/welcome';
}
