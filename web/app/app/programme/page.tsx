import { getT } from '@/lib/i18n/server';
import { requireStaff } from '@/lib/ctx';
import { ProgrammeBoard } from '@/components/programme/ProgrammeBoard';
import { festivalDays } from '@/lib/programme';

export async function generateMetadata() { const t = await getT(); return { title: t('البرنامج') }; }
export default async function Programme({ searchParams }: { searchParams: Promise<{ auto?: string }> }) {
  const { sb, festival } = await requireStaff();
  const sp = await searchParams;
  const [{ data: venues }, { data: screenings }, { data: films }] = await Promise.all([
    sb.from('venues').select('id,name,capacity').eq('festival_id', festival.id).order('sort'),
    sb.from('screenings').select('id,submission_id,venue_id,starts_at,duration_min').eq('festival_id', festival.id).order('starts_at'),
    sb.from('submissions').select('id,title,duration_min,genre,decision,categories(name),analyses(score)').eq('festival_id', festival.id).in('decision', ['accepted', 'shortlisted']),
  ]);
  const list = (films || []).map((f) => {
    const c = f.categories as unknown as { name: string } | { name: string }[] | null; const a = f.analyses as unknown as { score: number | null } | { score: number | null }[] | null;
    return { id: f.id, title: f.title, duration_min: f.duration_min, genre: f.genre, decision: f.decision, category: (Array.isArray(c) ? c[0]?.name : c?.name) || null, score: (Array.isArray(a) ? a[0]?.score : a?.score) ?? null };
  });
  return (
    <ProgrammeBoard venues={venues || []} screenings={screenings || []} films={list} days={festivalDays(festival.starts_on, festival.ends_on)}
      hasDates={!!festival.starts_on} published={!!festival.programme_published} slug={festival.slug} auto={sp.auto === '1'} />
  );
}
