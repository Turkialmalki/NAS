import Link from 'next/link';
import { getCtx } from '@/lib/ctx';
import { getT } from '@/lib/i18n/server';
import { loadMe } from '@/lib/me';
import { Icon } from '@/components/Icon';
import { FilmGrid } from '@/components/me/FilmGrid';

export async function generateMetadata() { const t = await getT(); return { title: t('أفلامي') }; }
export default async function Films() {
  const { sb } = await getCtx();
  const t = await getT();
  const { films } = await loadMe(sb);
  return (
    <>
      <div className="sec-h" style={{ alignItems: 'center' }}>
        <h1 style={{ fontSize: 32 }}>{t('أفلامي')}</h1>
        <Link href="/app/me/films/new" className="btn btn-p"><Icon name="up" size={16} />{t('أضف فيلمًا')}</Link>
      </div>
      <FilmGrid films={films} />
    </>
  );
}
