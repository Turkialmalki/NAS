import Link from 'next/link';
import { MiniHeader, SiteFooter } from '@/components/Site';
import { StatusLookup } from '@/components/apply/StatusLookup';

export const metadata = { title: 'تابع مشاركتك' };

export default async function StatusPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams;
  return (
    <>
      <MiniHeader right={<Link href="/apply" className="btn btn-s btn-sm">قدّم فيلمك</Link>} />
      <main className="wrap" style={{ paddingTop: 90, paddingBottom: 120, minHeight: '70vh', background: 'var(--glow) top / 100% 420px no-repeat' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 26 }}>
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h1 style={{ fontSize: 40 }}>تابع مشاركتك</h1>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: 16.5 }}>اكتب رقمك المرجعي والبريد الذي قدّمت به.</p>
          </div>
          <StatusLookup initialRef={ref || ''} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
