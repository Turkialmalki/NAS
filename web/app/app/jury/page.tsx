import { requireStaff } from '@/lib/ctx';
import { loadFilms, loadPeople } from '@/lib/data';
import { JuryBoard } from '@/components/app/JuryBoard';

export default async function JuryPage() {
  const { sb, festival } = await requireStaff();
  const [films, people, { data: invites }] = await Promise.all([
    loadFilms(sb, festival.id), loadPeople(sb, festival.id),
    sb.from('festival_invites').select('id,email,role,specialty').eq('festival_id', festival.id).is('accepted_at', null),
  ]);
  return <JuryBoard films={films} people={people} invites={invites || []} />;
}
