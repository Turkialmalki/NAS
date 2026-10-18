import { getCtx } from '@/lib/ctx';
import { MeHome } from '@/components/me/MeHome';
import { loadMe } from '@/lib/me';

export const metadata = { title: 'مساحتي' };

export default async function MePage() {
  const ctx = await getCtx();
  const data = await loadMe(ctx.sb);
  return <MeHome name={ctx.name} {...data} />;
}
