import { redirect } from 'next/navigation';
import { getCtx } from '@/lib/ctx';
import { AppShell } from '@/components/app/AppShell';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { memberships, current, name, isAdmin, accountType } = await getCtx();
  // everyone registers once (name + role) before reaching a dashboard
  if (!accountType && !memberships.some((m) => m.role !== 'reviewer')) redirect('/welcome');
  return (
    <AppShell
      name={name} isAdmin={isAdmin} role={current?.role || null}
      festivals={memberships.filter((m) => m.role !== 'reviewer').map((m) => ({ id: m.festival.id, name: m.festival.name, status: m.festival.status, edition: m.festival.edition }))}
      currentId={current?.festival.id || null} hasReview={memberships.some((m) => m.role === 'reviewer')} accountType={accountType}
    >
      {children}
    </AppShell>
  );
}
