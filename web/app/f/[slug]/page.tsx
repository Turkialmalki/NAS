import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabaseAnon } from '@/lib/supabase/server';
import { MiniHeader, SiteFooter } from '@/components/Site';
import { ApplyForm } from '@/components/apply/ApplyForm';
import { date, ar } from '@/lib/fmt';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data } = await supabaseAnon().from('festivals').select('name').eq('slug', slug).maybeSingle();
  return { title: data ? `قدّم فيلمك · ${data.name}` : 'قدّم فيلمك' };
}

export default async function FestivalApply({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sb = supabaseAnon();
  const { data: f } = await sb.from('festivals').select('*').eq('slug', slug).maybeSingle();
  if (!f) notFound();
  const { data: cats } = await sb.from('categories').select('id,name,description,fee').eq('festival_id', f.id).order('sort');
  return (
    <>
      <MiniHeader right={<Link href="/status" className="btn btn-s btn-sm">تابع مشاركتك</Link>} />
      <main className="wrap" style={{ maxWidth: 760, paddingTop: 56, paddingBottom: 100, display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'center', alignItems: 'center', marginBottom: 8 }}>
          <span className="chip c-ok"><span className="dot" />{f.submissions_close ? `التقديم مفتوح حتى ${date(f.submissions_close)}` : 'التقديم مفتوح'}</span>
          <h1 style={{ fontSize: 40 }}>قدّم فيلمك</h1>
          <span style={{ color: 'var(--muted)', fontSize: 16.5 }}>{f.name}{f.edition > 1 ? ` · الدورة ${ar(f.edition)}` : ''}{f.city ? ` · ${f.city}` : ''}</span>
          {f.description && <p style={{ margin: '6px 0 0', color: 'var(--muted)', maxWidth: 560, lineHeight: 1.8 }}>{f.description}</p>}
        </div>
        <ApplyForm festivalId={f.id} categories={cats || []} rules={f.rules || []} resultsOn={f.results_on} />
      </main>
      <SiteFooter />
    </>
  );
}
