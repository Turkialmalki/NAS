import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabaseAnon } from '@/lib/supabase/server';
import { getT } from '@/lib/i18n/server';
import { MiniHeader, SiteFooter } from '@/components/Site';
import { ApplyForm } from '@/components/apply/ApplyForm';
import { local, hhmm } from '@/lib/programme';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = await getT();
  const { data } = await supabaseAnon().from('festivals').select('name').eq('slug', slug).maybeSingle();
  return { title: data ? `${t('قدّم فيلمك')} · ${data.name}` : t('قدّم فيلمك') };
}

type Show = { starts_at: string; duration_min: number; venue: string; title: string; director: string | null; genre: string | null; category: string | null };

export default async function FestivalApply({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = await getT();
  const sb = supabaseAnon();
  const { data: f } = await sb.from('festivals').select('*').eq('slug', slug).maybeSingle();
  if (!f) notFound();
  const [{ data: cats }, { data: prog }] = await Promise.all([
    sb.from('categories').select('id,name,description,fee').eq('festival_id', f.id).order('sort'),
    f.programme_published ? sb.rpc('public_programme', { p_slug: slug }) : Promise.resolve({ data: [] as Show[] }),
  ]);
  const shows = (prog || []) as Show[];
  const days = [...new Set(shows.map((s) => local(s.starts_at).day))];
  const open = f.status === 'open';
  return (
    <>
      <MiniHeader right={<Link href="/status" className="btn btn-s btn-sm">{t('تابع مشاركتك')}</Link>} />
      <main className="wrap" style={{ maxWidth: 760, paddingTop: 56, paddingBottom: 100, display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'center', alignItems: 'center', marginBottom: 8 }}>
          <span className={`chip ${open ? 'c-ok' : 'c-mute'}`}><span className="dot" />{open ? (f.submissions_close ? t('التقديم مفتوح حتى {d}', { d: t.date(f.submissions_close) }) : t('التقديم مفتوح')) : t('التقديم مغلق')}</span>
          <h1 style={{ fontSize: 40 }}>{open ? t('قدّم فيلمك') : f.name}</h1>
          <span style={{ color: 'var(--muted)', fontSize: 16.5 }}>{open ? f.name : ''}{f.edition > 1 ? t(' · {v0}', { v0: t('الدورة {n}', { n: f.edition }) }) : ''}{f.city ? ` · ${f.city}` : ''}</span>
          {f.description && <p style={{ margin: '6px 0 0', color: 'var(--muted)', maxWidth: 560, lineHeight: 1.8 }}>{f.description}</p>}
        </div>
        {shows.length > 0 && (
          <section id="programme" className="card" style={{ padding: '24px 26px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            <h2 style={{ fontSize: 26 }} className="display">{t('جدول العروض')}</h2>
            {days.map((d) => (
              <div key={d} style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="eyebrow" style={{ marginBottom: 4 }}>{t.day(`${d}T12:00:00Z`)}</span>
                {shows.filter((s) => local(s.starts_at).day === d).map((s, i) => (
                  <div key={i} className="row" style={{ alignItems: 'flex-start' }}>
                    <span style={{ display: 'flex', gap: 16 }}>
                      <b className="num" style={{ minWidth: 50, fontSize: 15 }}>{t.n(hhmm(local(s.starts_at).min))}</b>
                      <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}><b style={{ fontSize: 15.5 }}>{s.title}</b><span style={{ fontSize: 13, color: 'var(--muted)' }}>{[s.director, s.category || (s.genre && t(s.genre)), t('{n} د', { n: s.duration_min })].filter(Boolean).join(' · ')}</span></span>
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{s.venue}</span>
                  </div>
                ))}
              </div>
            ))}
          </section>
        )}
        {open ? <ApplyForm festivalId={f.id} categories={cats || []} rules={f.rules || []} resultsOn={f.results_on} />
          : !shows.length && <div className="card empty">{t('التقديم لهذا المهرجان مغلق حاليًا.')}</div>}
      </main>
      <SiteFooter />
    </>
  );
}
