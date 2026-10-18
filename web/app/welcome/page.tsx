import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getCtx } from '@/lib/ctx';
import { getT } from '@/lib/i18n/server';
import { Register } from '@/components/Register';

export const dynamic = 'force-dynamic';
export async function generateMetadata() { const t = await getT(); return { title: t('أكمل تسجيلك') }; }

export default async function Welcome({ searchParams }: { searchParams: Promise<{ change?: string }> }) {
  const ctx = await getCtx();
  const sp = await searchParams;
  // registration happens once; ?change=1 lets a user pick a different role later
  if (ctx.accountType && sp.change !== '1') redirect('/app');
  const hint = (await cookies()).get('nas_role')?.value;
  const invites = ctx.memberships.filter((m) => m.role === 'reviewer').map((m) => m.festival.name);
  return <Register name={ctx.profile?.full_name || (ctx.user.user_metadata?.full_name as string) || ''} email={ctx.user.email || ''}
    initialRole={(['festival', 'filmmaker', 'judge'].includes(hint || '') ? hint : ctx.accountType) as never} invites={invites} />;
}
