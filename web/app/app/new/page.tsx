import { getCtx } from '@/lib/ctx';
import { NewFestivalForm } from '@/components/app/NewFestivalForm';

export default async function NewFestival() {
  const { memberships, user } = await getCtx();
  return <NewFestivalForm first={!memberships.length} suggestedName={(user.user_metadata?.festival as string) || ''} />;
}
