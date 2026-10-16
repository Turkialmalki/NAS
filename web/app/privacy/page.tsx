import { MiniHeader, SiteFooter } from '@/components/Site';
export const metadata = { title: 'سياسة الخصوصية' };
export default function Privacy() {
  return <><MiniHeader /><main className="wrap" style={{ maxWidth: 760, padding: '64px 32px 100px', lineHeight: 2, color: 'var(--ink2)' }}>
    <h1 style={{ fontSize: 36, color: 'var(--ink)', marginBottom: 20 }}>سياسة الخصوصية</h1>
    <p>نجمع في NAS ما نحتاجه فقط لتشغيل المهرجانات: بيانات الفيلم والمخرج والبريد الإلكتروني ونسخة المشاهدة.</p>
    <p>لا يرى نسخة المشاهدة إلا فريق المهرجان والمحكّمون المسند إليهم الفيلم. لا نبيع بياناتك ولا نشاركها مع أي طرف لأغراض تسويقية.</p>
    <p>يُستخدم التحليل الآلي لمساعدة لجان التحكيم في الفرز فقط، والقرار النهائي دائمًا للجنة.</p>
    <p>لطلب حذف بياناتك، راسل فريق المهرجان الذي قدّمت له أو تواصل معنا.</p>
  </main><SiteFooter /></>;
}
