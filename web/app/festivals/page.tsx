import { supabaseAnon } from '@/lib/supabase/server';
import { sessionUser } from '@/lib/ctx';
import { getT } from '@/lib/i18n/server';
import { SiteHeader, SiteFooter } from '@/components/Site';
import { FestivalDiscovery } from '@/components/me/FestivalDiscovery';
import { redirect } from 'next/navigation';

export async function generateMetadata() { const t = await getT(); return { title: t('اكتشف المهرجانات') }; }
export default async function PublicFestivals({ searchParams }: { searchParams: Promise<{ ai?: string }> }) {
  const sp = await searchParams;
  if (await sessionUser()) redirect(`/app/me/festivals${sp.ai ? `?ai=${encodeURIComponent(sp.ai)}` : ''}`);
  const { data } = await supabaseAnon().rpc('open_festivals');
  return (
    <>
      <SiteHeader />
      <main className="wrap" style={{ padding: '44px 32px 80px', display: 'flex', flexDirection: 'column', gap: 22 }}>
        <FestivalDiscovery festivals={(data || []) as never} initialAi={sp.ai || ''} signedIn={false} />
      </main>
      <SiteFooter />
    </>
  );
}
