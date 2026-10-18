'use client';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { FilmRow, Person } from '@/lib/data';
import { code, STATUS, DECISION } from '@/lib/fmt';
import { Icon, Spinner } from '../Icon';
import { Ring } from './ui';
import { VideoReport } from '../video/VideoReport';
import { VideoIntake } from '../video/VideoIntake';
import { AnalyzeExisting } from '../video/AnalyzeExisting';
import type { VideoAnalysis } from '@/lib/videoAnalysis';
import { setDecision, setStatus, assign, unassign, reanalyze, addFilm, publishDecisions, deleteFilm } from '@/app/app/films/actions';
import { aiFilter } from '@/app/actions/ai';
import { parseFilmQuery, applyFilmFilters, filmChips, removeChip, type FilmFilters } from '@/lib/nlFilter';
import { AiFilterBar } from './AiFilterBar';
import { useT } from '../Lang';

const QUICK: [string, string, FilmFilters][] = [['all', 'الكل', {}], ['un', 'بدون محكّم', { unassigned: true }], ['rev', 'اكتمل تقييمها', { reviewed: true }],
  ['wait', 'بانتظار القرار', { decision: ['pending'], reviewed: true }], ['ok', 'مقبولة', { decision: ['accepted'] }], ['top', 'الأعلى تقييمًا', { sort: 'score' }]];
const EXAMPLES = ['وثائقيات أقل من ٣٠ دقيقة بدون محكّم', 'أفلام سعودية تقييمها أعلى من ٧', 'أفلام مقبولة لم تُجدول بعد'];

export function FilmsBoard({ films, reviewers, categories, initialStatus, initialId, festivalId, initialAi = '', openAdd = false, scheduled = [] }: { festivalId: string; films: FilmRow[]; reviewers: Person[]; categories: { id: string; name: string }[]; initialStatus: string; initialId: string | null; initialAi?: string; openAdd?: boolean; scheduled?: string[] }) {
  const t = useT();
  const router = useRouter();
  const [ff, setFf] = useState<FilmFilters>(() => (initialAi ? parseFilmQuery(initialAi, categories).f : initialStatus === 'reviewed' ? { reviewed: true } : {}));
  const [searching, setSearching] = useState(false);
  const [cur, setCur] = useState<string | null>(initialId || films[0]?.id || null);
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState('');
  const [toast, setToast] = useState('');
  const [adding, setAdding] = useState(openAdd);
  const flash = (tx: string) => { setToast(tx); setTimeout(() => setToast(''), 2600); };

  const sched = useMemo(() => new Set(scheduled), [scheduled]);
  const list = useMemo(() => applyFilmFilters(films.map((x) => ({ ...x, scheduled: sched.has(x.id) })), ff), [films, ff, sched]);
  const chips = filmChips(ff, categories);
  const f = films.find((x) => x.id === cur) || null;
  const name = (id: string) => reviewers.find((r) => r.user_id === id)?.name || t('محكّم');
  const unpublished = films.filter((x) => x.decision !== 'pending' && !x.decision_published).length;

  async function search(text: string) {
    const q = text.trim();
    if (!q) { setFf({}); return; }
    const local = parseFilmQuery(q, categories).f;
    setFf(local);
    // let the AI refine when the instant parser left free words behind
    if (local.text?.length) {
      setSearching(true);
      const r = await aiFilter(q, 'films', categories).catch(() => null);
      if (r && Object.keys(r).length) setFf(r as FilmFilters);
      setSearching(false);
    }
  }
  useEffect(() => { if (initialAi) search(initialAi); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const quickOn = (v: FilmFilters) => JSON.stringify(v) === JSON.stringify(ff);
  const act = (label: string, fn: () => Promise<{ ok: boolean; error?: string }>, okMsg?: string) => {
    setBusy(label);
    start(async () => { const r = await fn(); setBusy(''); if (!r.ok) flash(t('تعذّر التنفيذ: ') + t(r.error || '')); else { if (okMsg) flash(okMsg); router.refresh(); } });
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 30 }}>{t('الأفلام')}</h1>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span className="num" style={{ fontSize: 14, color: 'var(--faint)' }}>{t.n(list.length)} {t('من')}{' '}{t.n(films.length)}</span>
          {unpublished > 0 && <button type="button" className="btn btn-s btn-sm" disabled={pending} onClick={() => act('pub', async () => { const r = await publishDecisions(); return r; }, 'نُشرت القرارات وأُبلغ صنّاع الأفلام.')}>{t('انشر')}{' '}{t.n(unpublished)} {t('قرارات')}</button>}
          <button type="button" className="btn btn-p" onClick={() => setAdding(true)}><Icon name="spark" size={16} />{t('ارفع فيلمًا وحلّله')}</button>
        </span>
      </div>

      <AiFilterBar initial={initialAi} chips={chips} busy={searching} count={list.length} total={films.length} examples={EXAMPLES}
        onQuery={search} onRemove={(k) => setFf((p) => removeChip(p, k))} onClear={() => setFf({})} />
      <div className="seg" role="group" aria-label={t('عروض سريعة')} style={{ alignSelf: 'flex-start', maxWidth: '100%', overflowX: 'auto', flexWrap: 'nowrap' }}>
        {QUICK.map(([k, l, v]) => <button key={k} type="button" className={quickOn(v) ? 'on' : ''} aria-pressed={quickOn(v)} onClick={() => setFf(v)} style={{ height: 32, fontSize: 13, padding: '0 12px', whiteSpace: 'nowrap' }}>{t(l)}</button>)}
      </div>

      <div className="stack" style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div className="card" style={{ flex: 1, minWidth: 0, overflowX: 'auto', padding: '4px 6px' }}>
          {films.length === 0 ? (
            <div style={{ padding: '56px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
              <span className="drop-ic" style={{ width: 68, height: 68, borderRadius: 22 }}><Icon name="film" size={30} /></span>
              <b style={{ fontSize: 22 }}>{t('أضف أول فيلم')}</b>
              <span style={{ color: 'var(--muted)', fontSize: 15, maxWidth: 440, lineHeight: 1.8 }}>{t('ارفع ملف الفيلم، ويشاهده NAS Vision ويكتب تقريرًا كاملًا ويعبّئ بياناته. أو شارك رابط التقديم ليرسل صنّاع الأفلام مشاركاتهم.')}</span>
              <button type="button" className="btn btn-p btn-lg" onClick={() => setAdding(true)} style={{ marginTop: 6 }}><Icon name="up" size={17} />{t('ارفع فيلمًا')}</button>
            </div>
          ) : (
            <table className="tbl">
              <thead><tr><th>{t('المشاركة')}</th><th>{t('الحالة')}</th><th>{t('التحليل')}</th><th>{t('القرار')}</th></tr></thead>
              <tbody>
                {list.map((x) => {
                  const why = '';
                  return (
                    <tr key={x.id} onClick={() => setCur(x.id)} style={{ cursor: 'pointer', background: cur === x.id ? 'var(--s2)' : undefined }}>
                      <td><span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <b style={{ fontSize: 15 }}>{x.title}</b>
                        <span style={{ fontSize: 12.5, color: 'var(--muted)' }}><span className="num" style={{ direction: 'ltr', display: 'inline-block' }}>{code(x.ref_code)}</span> · {[x.genre && t(x.genre), x.duration_min ? t('{n} د', { n: x.duration_min }) : null, x.director_name].filter(Boolean).join(' · ')}</span>
                        {why && <span style={{ fontSize: 12.5, color: 'var(--accHi)' }}>✦ {why}</span>}
                      </span></td>
                      <td><span className={`chip ${STATUS[x.status]?.[1]}`}><span className="dot" />{t(STATUS[x.status]?.[0] || "")}</span></td>
                      <td><b className="num" style={{ color: 'var(--accHi)' }}>{x.analysis?.score != null ? t.n(Number(x.analysis.score).toFixed(1)) : '—'}</b></td>
                      <td><span className={`chip ${DECISION[x.decision]?.[1]}`}>{t(DECISION[x.decision]?.[0] || "")}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {films.length > 0 && list.length === 0 && <div className="empty">{t('لا توجد أفلام بهذا الوصف.')}</div>}
        </div>

        {f && (
          <aside className="card rise" key={f.id} style={{ flex: '0 0 390px', padding: 22, display: 'flex', flexDirection: 'column', gap: 18, position: 'sticky', top: 80, maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <b style={{ fontSize: 20 }}>{f.title}</b>
                <span style={{ fontSize: 13.5, color: 'var(--muted)' }}>{[f.director_name, f.genre && t(f.genre), f.duration_min ? t('{n} د', { n: f.duration_min }) : null, f.country, categories.find((c) => c.id === f.category_id)?.name].filter(Boolean).join(' · ')}</span>
                <span className="num" style={{ fontSize: 12.5, color: 'var(--faint)', direction: 'ltr', textAlign: 'end' }}>{f.ref_code}</span>
              </span>
              <button type="button" className="ibtn" onClick={() => setCur(null)} aria-label={t('إغلاق')}><Icon name="x" size={17} /></button>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(f.screener_url || f.screener_path) && <a href={`/review/watch/${f.id}`} target="_blank" className="btn btn-s btn-sm"><Icon name="play" size={13} stroke={2} />{t('شاهد الفيلم')}</a>}
              <button type="button" className="btn btn-g btn-sm" disabled={pending} onClick={() => act('ai', () => reanalyze(f.id), 'اكتمل التحليل')}>{busy === 'ai' ? <Spinner size={14} /> : <Icon name="spark" size={14} />}{t('أعد التحليل')}</button>
            </div>

            <div style={{ padding: 18, borderRadius: 16, background: 'var(--accT)', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <span style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600, fontSize: 15 }}><span style={{ color: 'var(--acc)' }}><Icon name="spark" size={16} /></span>{t('تحليل NAS')}</span>
              {f.analysis ? (
                <>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    <Ring score={f.analysis.score != null ? Number(f.analysis.score) : null} size={76} />
                    <span style={{ fontSize: 14, color: 'var(--ink2)', lineHeight: 1.7 }}>{f.analysis.headline}</span>
                  </div>
                  <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{f.analysis.themes.map((tx) => <span key={tx} className="chip c-mute">{tx}</span>)}{f.analysis.tone.map((tx) => <span key={tx} className="chip c-vio">{tx}</span>)}</span>
                  {f.analysis.fit.length > 0 && <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {f.analysis.fit.map((x) => <div key={x.category} style={{ display: 'grid', gridTemplateColumns: '100px minmax(0,1fr) 36px', gap: 8, alignItems: 'center', fontSize: 13 }}><span>{x.category}</span><span className="bar"><span style={{ width: `${x.pct}%` }} /></span><b className="num" style={{ textAlign: 'end' }}>{t.n(x.pct)}{t('٪')}</b></div>)}
                  </div>}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{f.analysis.checks.map((c) => <span key={c.text} style={{ display: 'flex', gap: 8, fontSize: 13.5, color: 'var(--ink2)' }}><b style={{ color: c.ok ? 'var(--ok)' : 'var(--acc)' }}>{c.ok ? '✓' : '!'}</b>{c.text}</span>)}</div>
                </>
              ) : <span style={{ fontSize: 14, color: 'var(--muted)' }}>{t('لم يُحلَّل بعد. اضغط «أعد التحليل».')}</span>}
            </div>

            {(f.analysis?.video || f.screener_path) && (
              <div style={{ padding: 16, borderRadius: 16, border: '1px solid var(--accL)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <span style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600, fontSize: 15 }}><span style={{ color: 'var(--acc)' }}><Icon name="film" size={16} /></span>{t('NAS Vision · تحليل الفيديو')}</span>
                {f.analysis?.video ? <VideoReport r={f.analysis.video} compact /> : <span style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.7 }}>{t('شاهد NAS Vision الفيلم المرفوع: يلتقط المشاهد ويقرأ الصورة واللون والحرفة ويكتب تقريرًا للجنة.')}</span>}
                {f.screener_path && <AnalyzeExisting key={f.id} id={f.id} path={f.screener_path} festivalId={festivalId} again={!!f.analysis?.video} ctx={{ title: f.title, synopsis: f.synopsis, genre: f.genre, category_id: f.category_id }} />}
              </div>
            )}

            {f.synopsis && <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><b style={{ fontSize: 14.5 }}>{t('الملخص')}</b><p style={{ margin: 0, fontSize: 14, color: 'var(--ink2)', lineHeight: 1.8 }}>{f.synopsis}</p></div>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <b style={{ fontSize: 14.5, marginBottom: 4 }}>{t('لجنة التحكيم')}</b>
              {f.assignments.length === 0 && <span style={{ fontSize: 13.5, color: 'var(--faint)', padding: '6px 0' }}>{t('لم يُسند لمحكّم بعد.')}</span>}
              {f.assignments.map((a) => {
                const rv = f.reviews.find((r) => r.reviewer_id === a.reviewer_id);
                return (
                  <div key={a.reviewer_id} className="row" style={{ padding: '9px 0' }}>
                    <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}><span className="av" style={{ margin: 0 }}>{name(a.reviewer_id).slice(0, 1)}</span>{name(a.reviewer_id)}</span>
                    <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <b className="num">{rv?.total != null ? t.n(Number(rv.total).toFixed(1)) : a.status === 'in_progress' ? t('يشاهد') : t('لم يبدأ')}</b>
                      {!rv && <button type="button" className="ibtn" style={{ width: 28, height: 28 }} aria-label={t('إزالة')} onClick={() => act('un', () => unassign(f.id, a.reviewer_id))}><Icon name="x" size={13} /></button>}
                    </span>
                  </div>
                );
              })}
              {reviewers.length === 0 ? (
                <a href="/app/jury" className="link" style={{ fontSize: 13.5, marginTop: 6 }}>{t('أضف محكّمين لمهرجانك ←')}</a>
              ) : (
                <select className="fld" aria-label={t('أضف محكّمًا')} value="" disabled={pending} onChange={(e) => e.target.value && act('as', () => assign(f.id, e.target.value), 'تم الإسناد')} style={{ height: 42, marginTop: 8, fontSize: 14 }}>
                  <option value="">{t('+ أضف محكّمًا')}{f.analysis?.suggested_reviewer ? t(' · المقترح: {v0} ✦', { v0: name(f.analysis.suggested_reviewer) }) : ''}</option>
                  {reviewers.filter((r) => !f.assignments.some((a) => a.reviewer_id === r.user_id)).map((r) => <option key={r.user_id} value={r.user_id}>{r.name}{r.specialty ? ` · ${r.specialty}` : ''}</option>)}
                </select>
              )}
              {f.reviews.filter((r) => r.notes).map((r) => <p key={r.reviewer_id} style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.7 }}><b style={{ color: 'var(--ink2)' }}>{name(r.reviewer_id)}:</b> «{r.notes}»</p>)}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <b style={{ fontSize: 14.5 }}>{t('الحالة')}</b>
              <select className="fld" value={f.status} disabled={pending} onChange={(e) => act('st', () => setStatus(f.id, e.target.value))} style={{ height: 42, fontSize: 14 }}>
                {Object.entries(STATUS).map(([k, [l]]) => <option key={k} value={k}>{t(l)}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <b style={{ fontSize: 14.5 }}>{t('القرار')}</b>
              <div className="g2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                {Object.entries(DECISION).map(([k, [l, , col]]) => (
                  <button key={k} type="button" aria-pressed={f.decision === k} disabled={pending} onClick={() => act('dec', () => setDecision(f.id, k))}
                    style={{ height: 40, borderRadius: 11, border: `1px solid ${f.decision === k ? col : 'var(--line2)'}`, background: 'transparent', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: f.decision === k ? col : 'var(--ink2)' }}>{t(l)}</button>
                ))}
              </div>
              <span className="hint">{f.decision_published ? t('نُشر القرار لصانع الفيلم.') : t('يصل القرار لصانع الفيلم بالبريد عند نشر القرارات.')}</span>
            </div>
            <button type="button" className="btn btn-g btn-sm" style={{ alignSelf: 'flex-start', color: 'var(--no)' }} onClick={() => confirm(t('حذف هذه المشاركة نهائيًا؟')) && act('del', () => deleteFilm(f.id), 'حُذفت المشاركة')}>{t('حذف المشاركة')}</button>
          </aside>
        )}
      </div>

      {adding && <AddFilm festivalId={festivalId} categories={categories} onClose={() => setAdding(false)} onDone={(ref) => { router.refresh(); flash(t('أُضيف {ref} وحُلّل', { ref: ref })); }} />}
      {toast && <div className="toast">{t(toast)}</div>}
    </>
  );
}

function AddFilm({ festivalId, categories, onClose, onDone }: { festivalId: string; categories: { id: string; name: string }[]; onClose: () => void; onDone: (ref: string) => void }) {
  const t = useT();
  const [state, setState] = useState<'form' | 'run' | 'done'>('form');
  const [err, setErr] = useState('');
  const [ref, setRef] = useState('');
  const [path, setPath] = useState<string | null>(null);
  const [video, setVideo] = useState<{ r: VideoAnalysis; sig: string } | null>(null);
  const [v, setV] = useState({ title: '', director: '', email: '', genre: '', duration: '', category: '', synopsis: '', url: '' });
  const [filled, setFilled] = useState<string[]>([]);
  const [fe, setFe] = useState<Record<string, string>>({});
  const [showLink, setShowLink] = useState(false);
  const up = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setV((p) => ({ ...p, [k]: e.target.value }));
  const tag = (k: string) => (filled.includes(k) ? <span className="chip c-acc" style={{ height: 20, fontSize: 11, padding: '0 7px' }}>{t('✦ من الفيلم')}</span> : null);
  const cls = (k: string) => `fld${filled.includes(k) ? ' filled' : ''}`;
  const bad = (k: string) => (fe[k] ? { borderColor: 'var(--no)' } : undefined);

  function onReport(r: VideoAnalysis | null, sig: string | null) {
    setVideo(r && sig ? { r, sig } : null);
    if (!r) return;
    const got: string[] = [];
    setV((p) => {
      const n = { ...p };
      if (!p.title && r.title_guess) { n.title = r.title_guess; got.push('title'); }
      if (!p.genre && r.genre_guess) { n.genre = r.genre_guess; got.push('genre'); }
      if (!p.synopsis && r.synopsis_draft) { n.synopsis = r.synopsis_draft; got.push('synopsis'); }
      const c = categories.find((x) => x.name === r.fit[0]?.category);
      if (!p.category && c) { n.category = c.id; got.push('category'); }
      return n;
    });
    setFilled((x) => [...new Set([...x, ...got])]);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const x: Record<string, string> = {};
    if (!path && !v.url.trim()) x.media = video ? 'انتظر حتى يكتمل رفع الفيلم.' : 'ارفع ملف الفيلم أو أضف رابط مشاهدة.';
    if (v.url.trim() && !/^https?:\/\/\S+\.\S{2,}/i.test(v.url.trim())) x.url = 'الرابط غير صحيح.';
    if (v.title.trim().length < 2) x.title = 'اكتب عنوان الفيلم.';
    if (v.director.trim().length < 2) x.director = 'اكتب اسم المخرج.';
    if (v.email.trim() && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v.email.trim())) x.email = 'البريد غير صحيح.';
    if (v.duration && !(Number(v.duration) >= 1 && Number(v.duration) <= 600)) x.duration = 'رقم بين ١ و٦٠٠.';
    setFe(x);
    if (Object.keys(x).length) { setErr(t('أكمل الحقول المطلوبة.')); return; }
    setState('run'); setErr('');
    const fd = new FormData();
    Object.entries(v).forEach(([k, val]) => fd.set(k, val));
    fd.set('screener_path', path || '');
    fd.set('video_report', video ? JSON.stringify(video.r) : '');
    fd.set('video_sig', video?.sig || '');
    const r = await addFilm(fd);
    if (!r.ok) { setErr(r.error || t('تعذّر الحفظ')); setState('form'); return; }
    setRef(r.ref || ''); setState('done'); onDone(r.ref || '');
  }
  return (
    <div className="modal-bg" role="dialog" aria-modal="true" aria-label={t('أضف فيلمًا')} onClick={(e) => e.target === e.currentTarget && state !== 'run' && onClose()}>
      <div className="card rise" style={{ width: '100%', maxWidth: 780, padding: 28, borderRadius: 26, display: 'flex', flexDirection: 'column', gap: 18, maxHeight: '94vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><h2 style={{ fontSize: 24 }}>{t('أضف فيلمًا')}</h2><span style={{ fontSize: 14, color: 'var(--muted)' }}>{t('ارفع الملف ويحلّله NAS Vision ويعبّئ بياناته.')}</span></span>
          <button type="button" className="ibtn" onClick={onClose} aria-label={t('إغلاق')}><Icon name="x" /></button>
        </div>
        {state === 'form' && (
          <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <VideoIntake folder={festivalId} festivalId={festivalId} ctx={() => ({ title: v.title, synopsis: v.synopsis, genre: v.genre, category_id: v.category || null })}
                onUploaded={setPath} onReport={onReport} onDuration={(m) => { setV((p) => ({ ...p, duration: String(m) })); setFilled((x) => [...new Set([...x, 'duration'])]); }}
                onUseSynopsis={(tx) => setV((p) => ({ ...p, synopsis: tx }))} />
              {fe.media && <span className="err">{t(fe.media)}</span>}
              {!showLink ? <button type="button" className="btn btn-g btn-sm" style={{ alignSelf: 'center' }} onClick={() => setShowLink(true)}>{t('أو أضف رابط مشاهدة بدلًا من الملف')}</button>
                : <label className="lbl">{t('رابط المشاهدة')}<input className="fld" dir="ltr" value={v.url} onChange={up('url')} placeholder="https://vimeo.com/…" style={bad('url')} />{fe.url && <span className="err">{t(fe.url)}</span>}</label>}
            </div>
            {filled.length > 0 && <div className="rise" style={{ padding: '10px 14px', borderRadius: 12, background: 'var(--accT)', fontSize: 13.5 }}>{t('✦ عبّأ NAS Vision')}{' '}{t.n(filled.length)} {filled.length > 2 ? t('حقول') : t('حقلًا')} {t('من الفيلم. راجعها قبل الحفظ.')}</div>}
            <div className="g2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label className="lbl"><span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{t('عنوان الفيلم')}{' '}<b style={{ color: 'var(--no)' }}>*</b>{tag('title')}</span><input className={cls('title')} value={v.title} onChange={up('title')} style={bad('title')} />{fe.title && <span className="err">{t(fe.title)}</span>}</label>
              <label className="lbl"><span>{t('اسم المخرج')}{' '}<b style={{ color: 'var(--no)' }}>*</b></span><input className="fld" value={v.director} onChange={up('director')} style={bad('director')} />{fe.director && <span className="err">{t(fe.director)}</span>}</label>
              <label className="lbl"><span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{t('النوع')}{tag('genre')}</span><select className={cls('genre')} value={v.genre} onChange={up('genre')}><option value="">—</option><option value="روائي">{t('روائي')}</option><option value="وثائقي">{t('وثائقي')}</option><option value="تحريك">{t('تحريك')}</option><option value="تجريبي">{t('تجريبي')}</option></select></label>
              <label className="lbl"><span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{t('المدة بالدقائق')}{tag('duration')}</span><input className={`${cls('duration')} num`} inputMode="numeric" value={v.duration} onChange={(e) => setV((p) => ({ ...p, duration: e.target.value.replace(/\D/g, '').slice(0, 3) }))} style={bad('duration')} />{fe.duration && <span className="err">{t(fe.duration)}</span>}</label>
              <label className="lbl"><span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{t('القسم')}{tag('category')}</span><select className={cls('category')} value={v.category} onChange={up('category')}><option value="">—</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
              <label className="lbl">{t('بريد المخرج')}<input className="fld" dir="ltr" type="email" value={v.email} onChange={up('email')} style={bad('email')} />{fe.email && <span className="err">{t(fe.email)}</span>}</label>
            </div>
            <label className="lbl"><span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{t('الملخص')}{tag('synopsis')}</span><textarea className={cls('synopsis')} value={v.synopsis} onChange={up('synopsis')} style={{ height: 110 }} /></label>
            {err && <span className="err" style={{ textAlign: 'center' }}>{t(err)}</span>}
            <button className="btn btn-p btn-lg" style={{ alignSelf: 'center', minWidth: 260, height: 54 }}>{video && !path ? <><Spinner size={16} />{t('ننتظر اكتمال الرفع…')}</> : <><Icon name="check" size={16} stroke={2.4} />{t('أضف الفيلم')}</>}</button>
          </form>
        )}
        {state === 'run' && <div style={{ padding: '40px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, color: 'var(--muted)' }}><Spinner size={30} />{t('نحفظ الفيلم ونجهّز تحليله…')}</div>}
        {state === 'done' && (
          <div className="rise" style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', textAlign: 'center', padding: '10px 0' }}>
            <span style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--okT)', color: 'var(--ok)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={24} stroke={2.4} /></span>
            <b style={{ fontSize: 18 }}>{t('أُضيف الفيلم وحُلّل')}</b><span className="num" style={{ direction: 'ltr', color: 'var(--muted)' }}>{ref}</span>
            <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 420 }}><button type="button" className="btn btn-p" style={{ flex: 1 }} onClick={onClose}>{t('تم')}</button><button type="button" className="btn btn-s" onClick={() => { setState('form'); setV({ title: '', director: '', email: '', genre: '', duration: '', category: '', synopsis: '', url: '' }); setPath(null); setVideo(null); setFilled([]); }}>{t('أضف فيلمًا آخر')}</button></div>
          </div>
        )}
      </div>
    </div>
  );
}
