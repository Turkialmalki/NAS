import { getT } from '@/lib/i18n/server';
import Link from 'next/link';
export default async function NotFound() {
  const t = await getT();
  return <main style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, textAlign: 'center' }}><h1 style={{ fontSize: 40 }}>{t('الصفحة غير موجودة')}</h1><span style={{ color: 'var(--muted)' }}>{t('ربما تغيّر الرابط أو أُغلق التقديم.')}</span><Link href="/" className="btn btn-p">{t('الرئيسية')}</Link></main>;
}
