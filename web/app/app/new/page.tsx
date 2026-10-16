import { getCtx } from '@/lib/ctx';
import { NewFestivalForm } from '@/components/app/NewFestivalForm';

export default async function NewFestival() {
  const { memberships, user } = await getCtx();
  return <NewFestivalForm first={!memberships.length} suggestedName={(user.user_metadata?.festival as string) || ''} copyFrom={memberships.filter((m) => m.role !== 'reviewer').map((m) => ({ id: m.festival.id, name: m.festival.name, edition: m.festival.edition }))} />;
}
