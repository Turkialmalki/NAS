import { MiniHeader, SiteFooter } from '@/components/Site';
export const metadata = { title: 'الشروط والأحكام' };
export default function Terms() {
  return <><MiniHeader /><main className="wrap" style={{ maxWidth: 760, padding: '64px 32px 100px', lineHeight: 2, color: 'var(--ink2)' }}>
    <h1 style={{ fontSize: 36, color: 'var(--ink)', marginBottom: 20 }}>الشروط والأحكام</h1>
    <p>باستخدامك NAS تقرّ بأن لديك الحق في تقديم الفيلم ومشاركة نسخة المشاهدة مع المهرجان.</p>
    <p>كل مهرجان يحدد شروطه وأقسامه ومواعيده، وهو المسؤول عن قرارات القبول والاعتذار.</p>
    <p>نسخ المشاهدة للمشاهدة داخل المنصة فقط، ويُمنع تنزيلها أو نشرها.</p>
  </main><SiteFooter /></>;
}
