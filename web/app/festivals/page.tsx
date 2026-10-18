import { supabaseAnon } from '@/lib/supabase/server';
import { sessionUser } from '@/lib/ctx';
import { getT } from '@/lib/i18n/server';
import { SiteHeader, SiteFooter } from '@/components/Site';
import { FestivalDiscovery } from '@/components/me/FestivalDiscovery';

export async function generateMetadata() { const t = await getT(); return { title: t('المهرجانات') }; }
export default async function PublicFestivals({ searchParams }: { searchParams: Promise<{ ai?: string }> }) {
  const sp = await searchParams;
  const [{ data }, user] = await Promise.all([supabaseAnon().rpc('open_festivals'), sessionUser()]);
  return (
    <>
      <SiteHeader />
      <main className="wrap" style={{ paddingTop: 72, paddingBottom: 110, display: 'flex', flexDirection: 'column', gap: 22 }}>
        <FestivalDiscovery festivals={(data || []) as never} initialAi={sp.ai || ''} signedIn={false} variant="public" key={user ? 'u' : 'a'} />
      </main>
      <SiteFooter />
    </>
  );
}
