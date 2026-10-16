import { requireStaff } from '@/lib/ctx';
import { loadFilms, loadPeople } from '@/lib/data';
import { FilmsBoard } from '@/components/app/FilmsBoard';

export default async function FilmsPage({ searchParams }: { searchParams: Promise<{ st?: string; id?: string }> }) {
  const { sb, festival } = await requireStaff();
  const sp = await searchParams;
  const [films, people, { data: cats }] = await Promise.all([
    loadFilms(sb, festival.id), loadPeople(sb, festival.id),
    sb.from('categories').select('id,name').eq('festival_id', festival.id).order('sort'),
  ]);
  return <FilmsBoard films={films} reviewers={people.filter((p) => p.role === 'reviewer')} categories={cats || []} initialStatus={sp.st || 'all'} initialId={sp.id || null} />;
}
