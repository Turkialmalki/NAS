import { getT } from '@/lib/i18n/server';
import { getCtx } from '@/lib/ctx';
import { MeHome } from '@/components/me/MeHome';
import { loadMe } from '@/lib/me';

export async function generateMetadata() { const t = await getT(); return { title: t('الرئيسية') }; }

export default async function MePage() {
  const ctx = await getCtx();
  const data = await loadMe(ctx.sb);
  return <MeHome name={ctx.name} {...data} />;
}
