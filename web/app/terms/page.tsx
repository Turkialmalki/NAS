import { getT } from '@/lib/i18n/server';
import { MiniHeader, SiteFooter } from '@/components/Site';
export async function generateMetadata() { const t = await getT(); return { title: t('الشروط والأحكام') }; }
export default async function Terms() {
  const t = await getT();
  return <><MiniHeader /><main className="wrap" style={{ maxWidth: 760, padding: '64px 32px 100px', lineHeight: 2, color: 'var(--ink2)' }}>
    <h1 style={{ fontSize: 36, color: 'var(--ink)', marginBottom: 20 }}>{t('الشروط والأحكام')}</h1>
    <p>{t('باستخدامك NAS تقرّ بأن لديك الحق في تقديم الفيلم ومشاركة نسخة المشاهدة مع المهرجان.')}</p>
    <p>{t('كل مهرجان يحدد شروطه وأقسامه ومواعيده، وهو المسؤول عن قرارات القبول والاعتذار.')}</p>
    <p>{t('نسخ المشاهدة للمشاهدة داخل المنصة فقط، ويُمنع تنزيلها أو نشرها.')}</p>
  </main><SiteFooter /></>;
}
