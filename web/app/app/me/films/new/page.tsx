import { getT } from '@/lib/i18n/server';
import { getCtx } from '@/lib/ctx';
import { ProjectEditor } from '@/components/me/ProjectEditor';

export async function generateMetadata() { const t = await getT(); return { title: t('فيلم جديد') }; }
export default async function NewFilm() {
  const { user } = await getCtx();
  return <ProjectEditor userId={user.id} />;
}
