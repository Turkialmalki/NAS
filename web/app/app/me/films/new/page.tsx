import { getCtx } from '@/lib/ctx';
import { ProjectEditor } from '@/components/me/ProjectEditor';

export const metadata = { title: 'فيلم جديد' };
export default async function NewFilm() {
  const { user } = await getCtx();
  return <ProjectEditor userId={user.id} />;
}
