import { requireStaff } from '@/lib/ctx';
import { loadFilms, loadPeople } from '@/lib/data';
import { FilmsBoard } from '@/components/app/FilmsBoard';

export default async function FilmsPage({ searchParams }: { searchParams: Promise<{ st?: string; id?: string; ai?: string; add?: string }> }) {
  const { sb, festival } = await requireStaff();
  const sp = await searchParams;
  const [films, people, { data: cats }, { data: sc }] = await Promise.all([
    loadFilms(sb, festival.id), loadPeople(sb, festival.id),
    sb.from('categories').select('id,name').eq('festival_id', festival.id).order('sort'),
    sb.from('screenings').select('submission_id').eq('festival_id', festival.id),
  ]);
  return <FilmsBoard films={films} reviewers={people.filter((p) => p.role === 'reviewer')} categories={cats || []} initialStatus={sp.st || 'all'} initialId={sp.id || null}
    festivalId={festival.id} initialAi={sp.ai || ''} openAdd={sp.add === '1'} scheduled={(sc || []).map((x) => x.submission_id)} key={sp.ai || 'films'} />;
}
