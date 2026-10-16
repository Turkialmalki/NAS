import Link from 'next/link';
import { redirect } from 'next/navigation';
import { supabaseAnon } from '@/lib/supabase/server';
import { MiniHeader, SiteFooter } from '@/components/Site';
import { date } from '@/lib/fmt';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'قدّم فيلمك' };

export default async function ApplyIndex() {
  const { data } = await supabaseAnon().from('festivals').select('name,slug,city,submissions_close,edition').eq('status', 'open').eq('visibility', 'public').order('submissions_close');
  const list = data || [];
  if (list.length === 1) redirect(`/f/${list[0].slug}`);
  return (
    <>
      <MiniHeader right={<Link href="/status" className="btn btn-s btn-sm">تابع مشاركتك</Link>} />
      <main className="wrap" style={{ maxWidth: 760, paddingTop: 72, paddingBottom: 120, minHeight: '70vh', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
          <h1 style={{ fontSize: 40 }}>قدّم فيلمك</h1>
          <span style={{ color: 'var(--muted)', fontSize: 16.5 }}>اختر المهرجان الذي تريد التقديم له.</span>
        </div>
        {list.length === 0 && <div className="card empty" style={{ borderRadius: 20 }}>لا توجد مهرجانات تستقبل الأفلام الآن.<br />إن وصلك رابط تقديم من مهرجان، افتحه مباشرة.</div>}
        {list.map((f) => (
          <Link key={f.slug} href={`/f/${f.slug}`} className="card" style={{ padding: '20px 22px', borderRadius: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><b style={{ fontSize: 17 }}>{f.name}</b><span style={{ fontSize: 13.5, color: 'var(--muted)' }}>{f.city || ''}{f.submissions_close ? ` · التقديم حتى ${date(f.submissions_close)}` : ''}</span></span>
            <span className="btn btn-p btn-sm">قدّم</span>
          </Link>
        ))}
      </main>
      <SiteFooter />
    </>
  );
}
