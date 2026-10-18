'use client';
import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Logo } from '../Logo';
import { ThemeToggle } from '../ThemeToggle';
import { Icon, Spinner } from '../Icon';
import { ar, code, date } from '@/lib/fmt';
import { startWatching, submitReview } from '@/app/review/actions';

type Film = { id: string; due_at: string | null; ref_code: string; title: string; genre: string | null; duration_min: number | null; synopsis: string | null; status: string; festival_id: string; category: string | null;
  festival: { name: string; review_deadline: string | null } | null; embed: string | null; hasFile: boolean; screener_url: string | null;
  analysis: { themes: string[]; tone: string[]; headline: string | null; checks: { ok: boolean; text: string }[] } | null;
  review: { scores: Record<string, number>; notes: string | null; total: number } | null };
type Crit = { id: string; name: string; weight: number; festival_id: string };
const W = ['ضعيف', 'مقبول', 'جيد', 'جيد جدًا', 'ممتاز'];

export function ReviewDesk({ name, films, criteria, isStaff }: { name: string; films: Film[]; criteria: Crit[]; isStaff: boolean }) {
  const router = useRouter();
  const firstOpen = films.find((f) => !f.review) || films[0];
  const [ci, setCi] = useState(firstOpen?.id || null);
  const f = films.find((x) => x.id === ci) || null;
  const crit = criteria.filter((c) => c.festival_id === f?.festival_id);
  const [sc, setSc] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const [watched, setWatched] = useState(false);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState('');
  useEffect(() => { setSc(f?.review?.scores || {}); setNotes(f?.review?.notes || ''); setWatched(!!f?.review || f?.status === 'in_progress'); }, [ci]); // eslint-disable-line react-hooks/exhaustive-deps

  const wsum = crit.reduce((a, c) => a + c.weight, 0) || 1;
  const filled = crit.every((c) => sc[c.id]);
  const total = crit.length ? Math.round((crit.reduce((a, c) => a + (sc[c.id] || 0) * c.weight, 0) / wsum) * 2 * 10) / 10 : 0;
  const doneN = films.filter((x) => x.review).length;
  const stepN = f?.review ? 3 : watched ? 2 : 1;

  return (
    <>
      <header className="hdr"><div className="wrap" style={{ maxWidth: 1100, height: 64, display: 'flex', alignItems: 'center', gap: 14 }}>
        <Logo href="/review" id="lgr" /><span className="chip c-mute">لجنة التحكيم</span><span style={{ flex: 1 }} />
        {isStaff && <Link href="/app" className="btn btn-g btn-sm">لوحة المهرجان</Link>}
        <ThemeToggle />
        <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}><span className="av" style={{ margin: 0 }}>{name.slice(0, 1)}</span>{name}</span>
        <form action="/auth/signout" method="post"><button className="ibtn" aria-label="خروج"><Icon name="out" size={16} /></button></form>
      </div></header>
      <main className="wrap" style={{ maxWidth: 1100, paddingTop: 36, paddingBottom: 80, display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
          <div><h1 style={{ fontSize: 30 }}>أفلامك</h1><p style={{ margin: '8px 0 0', color: 'var(--muted)', fontSize: 15.5 }}>قيّمت {ar(doneN)} من {ar(films.length)}{f?.festival?.review_deadline ? ` · آخر موعد ${date(f.festival.review_deadline)}` : ''}</p></div>
          <span className="chip c-mute"><Icon name="lock" size={13} /> تشوف أفلامك فقط</span>
        </div>
        {films.length === 0 ? (
          <div className="card empty" style={{ borderRadius: 22 }}>ما أُسند لك أي فيلم بعد. بنرسل لك أول ما يوصلك فيلم.</div>
        ) : (
          <>
            <div className="g4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
              {films.map((m) => (
                <button key={m.id} type="button" onClick={() => setCi(m.id)} aria-pressed={ci === m.id} style={{ textAlign: 'start', padding: 16, borderRadius: 16, border: `1px solid ${ci === m.id ? 'var(--accL)' : 'var(--line)'}`, background: 'var(--s1)', color: 'var(--ink)', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}><b style={{ fontSize: 14.5 }}>{m.title}</b><span className={`chip ${m.review ? 'c-ok' : ci === m.id ? 'c-acc' : 'c-mute'}`}>{m.review ? 'قيّمته' : ci === m.id ? 'الآن' : 'لم تبدأ'}</span></span>
                  <span style={{ fontSize: 12.5, color: 'var(--muted)' }}><span className="num" style={{ direction: 'ltr', display: 'inline-block' }}>{code(m.ref_code)}</span> · {[m.genre, m.duration_min ? `${ar(m.duration_min)} د` : null, m.category].filter(Boolean).join(' · ')}</span>
                  {!m.review && m.due_at && <span style={{ fontSize: 12, color: new Date(m.due_at).getTime() < Date.now() ? 'var(--no)' : 'var(--faint)' }}><Icon name="clock" size={11} /> {new Date(m.due_at).getTime() < Date.now() ? 'تجاوز الموعد' : `قبل ${date(m.due_at)}`}</span>}
                </button>
              ))}
            </div>
            {f && (
              <div className="card" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 24, borderRadius: 24 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {['شاهد الفيلم', 'قيّمه', 'أرسل تقييمك'].map((t, i) => (
                    <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, height: 34, padding: '0 14px 0 6px', borderRadius: 99, fontSize: 13.5, ...(i + 1 <= stepN ? { background: 'var(--s2)', color: 'var(--ink)' } : { color: 'var(--faint)', border: '1px solid var(--line)' }) }}>
                      <span className="num" style={{ width: 24, height: 24, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, ...(i + 1 < stepN || f.review ? { background: 'var(--acc)', color: 'var(--onAcc)' } : i + 1 === stepN ? { background: 'var(--accT)', color: 'var(--accHi)' } : { background: 'var(--s2)' }) }}>{i + 1 < stepN || f.review ? '✓' : ar(i + 1)}</span>{t}
                    </span>
                  ))}
                </div>
                <div className="g2" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 1fr)', gap: 24, alignItems: 'start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ aspectRatio: '16 / 9', borderRadius: 18, overflow: 'hidden', border: '1px solid var(--line)', background: 'var(--bg2)' }}>
                      {watched && f.embed ? <iframe src={f.embed} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen style={{ width: '100%', height: '100%', border: 0 }} />
                        : (
                          <button type="button" onClick={() => { setWatched(true); startWatching(f.id); if (!f.embed) window.open(`/review/watch/${f.id}`, '_blank'); }} style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, cursor: 'pointer', background: 'transparent', border: 0, color: 'var(--ink)' }}>
                            <span style={{ width: 68, height: 68, borderRadius: '50%', background: 'var(--acc)', color: 'var(--onAcc)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="play" size={24} stroke={2} /></span>
                            <span style={{ fontSize: 14, color: 'var(--muted)' }}>{watched ? 'افتح المشاهدة مرة أخرى' : 'ابدأ المشاهدة · نسخة محمية'}</span>
                          </button>
                        )}
                    </div>
                    {f.synopsis && <div style={{ fontSize: 14.5, color: 'var(--ink2)', lineHeight: 1.85 }}><b style={{ display: 'block', marginBottom: 4 }}>الملخص</b>{f.synopsis}</div>}
                    {f.analysis && (
                      <div style={{ padding: 18, borderRadius: 16, background: 'var(--accT)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <span style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600, fontSize: 14.5 }}><span style={{ color: 'var(--acc)' }}><Icon name="spark" size={16} /></span>نظرة سريعة من NAS</span>
                        {f.analysis.themes.length > 0 && <span style={{ fontSize: 14, color: 'var(--ink2)' }}>• الموضوعات: {f.analysis.themes.join('، ')}.</span>}
                        {f.analysis.tone.length > 0 && <span style={{ fontSize: 14, color: 'var(--ink2)' }}>• النبرة: {f.analysis.tone.join('، ')}.</span>}
                        {f.analysis.checks.filter((c) => !c.ok).map((c) => <span key={c.text} style={{ fontSize: 14, color: 'var(--ink2)' }}>• {c.text}</span>)}
                        <span style={{ fontSize: 12.5, color: 'var(--faint)' }}>للاستئناس فقط. تقييمك أنت هو المعتمد.</span>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    {crit.map((c) => (
                      <div key={c.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14.5 }}><b>{c.name}</b><span style={{ color: 'var(--muted)' }}>{sc[c.id] ? W[sc[c.id] - 1] : ''}</span></span>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                          {[1, 2, 3, 4, 5].map((n) => {
                            const on = sc[c.id] === n; const under = (sc[c.id] || 0) > n;
                            return <button key={n} type="button" className="num" aria-label={`${c.name} ${W[n - 1]}`} aria-pressed={on} onClick={() => setSc({ ...sc, [c.id]: n })}
                              style={{ height: 40, borderRadius: 10, border: '1px solid var(--line2)', fontWeight: 700, cursor: 'pointer', color: on ? 'var(--onAcc)' : under ? 'var(--accHi)' : 'var(--muted)', background: on ? 'var(--acc)' : under ? 'var(--accT)' : 'transparent', borderColor: on || under ? 'transparent' : 'var(--line2)' }}>{ar(n)}</button>;
                          })}
                        </div>
                      </div>
                    ))}
                    <label className="lbl">ملاحظاتك<textarea className="fld" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="اختياري: وش لفت انتباهك؟" style={{ height: 90 }} /></label>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, borderTop: '1px solid var(--line)' }}>
                      <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span style={{ fontSize: 13, color: 'var(--muted)' }}>تقييمك</span><b className="num" style={{ fontSize: 26, color: 'var(--accHi)' }}>{filled ? `${ar(total.toFixed(1))} / ١٠` : '—'}</b></span>
                      <button type="button" className="btn btn-p btn-lg" disabled={!filled || pending} style={!filled ? { opacity: 0.45 } : undefined}
                        onClick={() => start(async () => { const r = await submitReview(f.id, sc, total, notes); setMsg(r.ok ? 'وصل تقييمك ✓' : 'تعذّر الإرسال'); router.refresh(); setTimeout(() => setMsg(''), 2500);
                          const nxt = films.find((x) => !x.review && x.id !== f.id); if (r.ok && nxt) setCi(nxt.id); })}>
                        {pending ? <Spinner size={16} /> : f.review ? 'حدّث التقييم' : 'أرسل التقييم'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
      {msg && <div className="toast">{msg}</div>}
    </>
  );
}
