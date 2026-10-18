import { getCtx } from '@/lib/ctx';
import { loadMe } from '@/lib/me';
import { FestivalDiscovery } from '@/components/me/FestivalDiscovery';

export const metadata = { title: 'اكتشف المهرجانات' };
export default async function Discover({ searchParams }: { searchParams: Promise<{ ai?: string }> }) {
  const { sb } = await getCtx();
  const sp = await searchParams;
  const { films, festivals } = await loadMe(sb);
  return <FestivalDiscovery key={sp.ai || 'all'} festivals={festivals as never} films={films} initialAi={sp.ai || ''} signedIn />;
}
