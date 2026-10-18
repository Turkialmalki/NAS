import { notFound } from 'next/navigation';
import { getCtx } from '@/lib/ctx';
import { ProjectEditor } from '@/components/me/ProjectEditor';
import type { MySub } from '@/lib/me';
import type { RecFestival } from '@/lib/recommend';

export default async function FilmPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { sb, user } = await getCtx();
  const [{ data: p }, { data: subs }, { data: fests }] = await Promise.all([
    sb.from('projects').select('*').eq('id', id).maybeSingle(), sb.rpc('my_submissions'), sb.rpc('open_festivals'),
  ]);
  if (!p) notFound();
  const { video, video_sig: _sig, ...project } = p; // eslint-disable-line @typescript-eslint/no-unused-vars
  return <ProjectEditor userId={user.id} project={project} video={video} festivals={(fests || []) as RecFestival[]} subs={((subs || []) as MySub[]).filter((s) => s.project_id === id)} />;
}
