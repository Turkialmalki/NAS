'use client';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { FilmRow, Person } from '@/lib/data';
import { ar, code, STATUS, DECISION } from '@/lib/fmt';
import { Icon, Spinner } from '../Icon';
import { Ring } from './ui';
import { setDecision, setStatus, assign, unassign, reanalyze, addFilm, smartSearch, publishDecisions, deleteFilm } from '@/app/app/films/actions';

const STS = [['all', 'الكل'], ['uploaded', 'مرفوع'], ['processing', 'قيد المعالجة'], ['analyzed', 'تم التحليل'], ['reviewed', 'تمت المراجعة']];
const SUGS = ['وثائقي عن الأرض والعائلة', 'دراما أقل من ٩٠ دقيقة', 'تحريك قصير'];

export function FilmsBoard({ films, reviewers, categories, initialStatus, initialId }: { films: FilmRow[]; reviewers: Person[]; categories: { id: string; name: string }[]; initialStatus: string; initialId: string | null }) {
  const router = useRouter();
  const [st, setSt] = useState(initialStatus);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<{ id: string; why: string }[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [cur, setCur] = useState<string | null>(initialId || films[0]?.id || null);
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState('');
  const [toast, setToast] = useState('');
  const [adding, setAdding] = useState(false);
  const flash = (t: string) => { setToast(t); setTimeout(() => setToast(''), 2600); };

  const list = useMemo(() => {
    let l = films.filter((f) => st === 'all' || f.status === st);
    if (hits) { const order = new Map(hits.map((h, i) => [h.id, i])); l = l.filter((f) => order.has(f.id)).sort((a, b) => order.get(a.id)! - order.get(b.id)!); }
    return l;
  }, [films, st, hits]);
  const f = films.find((x) => x.id === cur) || null;
  const name = (id: string) => reviewers.find((r) => r.user_id === id)?.name || 'محكّم';
  const unpublished = films.filter((x) => x.decision !== 'pending' && !x.decision_published).length;

  async function search(text?: string) {
    const t = (text ?? q).trim();
    if (text != null) setQ(text);
    if (!t) { setHits(null); return; }
    setSearching(true);
    setHits(await smartSearch(t));
    setSearching(false);
  }
  const act = (label: string, fn: () => Promise<{ ok: boolean; error?: string }>, okMsg?: string) => {
    setBusy(label);
    start(async () => { const r = await fn(); setBusy(''); if (!r.ok) flash('تعذّر التنفيذ: ' + (r.error || '')); else { if (okMsg) flash(okMsg); router.refresh(); } });
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 30 }}>الأفلام</h1>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span className="num" style={{ fontSize: 14, color: 'var(--faint)' }}>{ar(list.length)} من {ar(films.length)}</span>
          {unpublished > 0 && <button type="button" className="btn btn-s btn-sm" disabled={pending} onClick={() => act('pub', async () => { const r = await publishDecisions(); return r; }, 'نُشرت القرارات وأُبلغ صنّاع الأفلام.')}>انشر {ar(unpublished)} قرارات</button>}
          <button type="button" className="btn btn-p btn-sm" onClick={() => setAdding(true)}><Icon name="plus" size={16} />أضف فيلمًا</button>
        </span>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); search(); }} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <label style={{ flex: 1, position: 'relative', display: 'block' }}>
          <span style={{ position: 'absolute', insetInlineStart: 16, top: 15, color: 'var(--acc)' }}><Icon name="spark" /></span>
          <input className="fld" value={q} onChange={(e) => { setQ(e.target.value); if (!e.target.value) setHits(null); }} placeholder="ابحث بالكلام العادي، مثلًا: وثائقي عن الأرض والعائلة" aria-label="بحث ذكي"
            style={{ height: 50, paddingInlineStart: 46, background: 'var(--s1)', borderColor: 'var(--accL)' }} />
        </label>
        <button className="btn btn-p" style={{ height: 50 }} disabled={searching}>{searching ? <Spinner size={16} /> : 'ابحث'}</button>
      </form>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {SUGS.map((s) => <button key={s} type="button" className={`pill-btn ${q === s && hits ? 'on' : ''}`} onClick={() => search(s)}>{s}</button>)}
        {hits && <button type="button" className="btn btn-g btn-sm" onClick={() => { setQ(''); setHits(null); }}>مسح البحث</button>}
        <span style={{ flex: 1 }} />
        <div className="seg" role="group" aria-label="الحالة">
          {STS.map(([k, l]) => <button key={k} type="button" className={st === k ? 'on' : ''} aria-pressed={st === k} onClick={() => setSt(k)} style={{ height: 32, fontSize: 13, padding: '0 12px' }}>{l}</button>)}
        </div>
      </div>

      <div className="stack" style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div className="card" style={{ flex: 1, minWidth: 0, overflowX: 'auto', padding: '4px 6px' }}>
          {films.length === 0 ? (
            <div className="empty">لا توجد مشاركات بعد. شارك رابط التقديم، أو أضف فيلمًا بنفسك.</div>
          ) : (
            <table className="tbl">
              <thead><tr><th>المشاركة</th><th>الحالة</th><th>التحليل</th><th>القرار</th></tr></thead>
              <tbody>
                {list.map((x) => {
                  const why = hits?.find((h) => h.id === x.id)?.why;
                  return (
                    <tr key={x.id} onClick={() => setCur(x.id)} style={{ cursor: 'pointer', background: cur === x.id ? 'var(--s2)' : undefined }}>
                      <td><span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <b style={{ fontSize: 15 }}>{x.title}</b>
                        <span style={{ fontSize: 12.5, color: 'var(--muted)' }}><span className="num" style={{ direction: 'ltr', display: 'inline-block' }}>{code(x.ref_code)}</span> · {[x.genre, x.duration_min ? `${ar(x.duration_min)} د` : null, x.director_name].filter(Boolean).join(' · ')}</span>
                        {why && <span style={{ fontSize: 12.5, color: 'var(--accHi)' }}>✦ {why}</span>}
                      </span></td>
                      <td><span className={`chip ${STATUS[x.status]?.[1]}`}><span className="dot" />{STATUS[x.status]?.[0]}</span></td>
                      <td><b className="num" style={{ color: 'var(--accHi)' }}>{x.analysis?.score != null ? ar(Number(x.analysis.score).toFixed(1)) : '—'}</b></td>
                      <td><span className={`chip ${DECISION[x.decision]?.[1]}`}>{DECISION[x.decision]?.[0]}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {films.length > 0 && list.length === 0 && <div className="empty">ما لقينا أفلامًا بهذا الوصف.</div>}
        </div>

        {f && (
          <aside className="card rise" key={f.id} style={{ flex: '0 0 390px', padding: 22, display: 'flex', flexDirection: 'column', gap: 18, position: 'sticky', top: 80, maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <b style={{ fontSize: 20 }}>{f.title}</b>
                <span style={{ fontSize: 13.5, color: 'var(--muted)' }}>{[f.director_name, f.genre, f.duration_min ? `${ar(f.duration_min)} د` : null, f.country, categories.find((c) => c.id === f.category_id)?.name].filter(Boolean).join(' · ')}</span>
                <span className="num" style={{ fontSize: 12.5, color: 'var(--faint)', direction: 'ltr', textAlign: 'end' }}>{f.ref_code}</span>
              </span>
              <button type="button" className="ibtn" onClick={() => setCur(null)} aria-label="إغلاق"><Icon name="x" size={17} /></button>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(f.screener_url || f.screener_path) && <a href={`/review/watch/${f.id}`} target="_blank" className="btn btn-s btn-sm"><Icon name="play" size={13} stroke={2} />شاهد الفيلم</a>}
              <button type="button" className="btn btn-g btn-sm" disabled={pending} onClick={() => act('ai', () => reanalyze(f.id), 'اكتمل التحليل')}>{busy === 'ai' ? <Spinner size={14} /> : <Icon name="spark" size={14} />}أعد التحليل</button>
            </div>

            <div style={{ padding: 18, borderRadius: 16, background: 'var(--accT)', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <span style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600, fontSize: 15 }}><span style={{ color: 'var(--acc)' }}><Icon name="spark" size={16} /></span>تحليل NAS</span>
              {f.analysis ? (
                <>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    <Ring score={f.analysis.score != null ? Number(f.analysis.score) : null} size={76} />
                    <span style={{ fontSize: 14, color: 'var(--ink2)', lineHeight: 1.7 }}>{f.analysis.headline}</span>
                  </div>
                  <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{f.analysis.themes.map((t) => <span key={t} className="chip c-mute">{t}</span>)}{f.analysis.tone.map((t) => <span key={t} className="chip c-vio">{t}</span>)}</span>
                  {f.analysis.fit.length > 0 && <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {f.analysis.fit.map((x) => <div key={x.category} style={{ display: 'grid', gridTemplateColumns: '100px minmax(0,1fr) 36px', gap: 8, alignItems: 'center', fontSize: 13 }}><span>{x.category}</span><span className="bar"><span style={{ width: `${x.pct}%` }} /></span><b className="num" style={{ textAlign: 'end' }}>{ar(x.pct)}٪</b></div>)}
                  </div>}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{f.analysis.checks.map((c) => <span key={c.text} style={{ display: 'flex', gap: 8, fontSize: 13.5, color: 'var(--ink2)' }}><b style={{ color: c.ok ? 'var(--ok)' : 'var(--acc)' }}>{c.ok ? '✓' : '!'}</b>{c.text}</span>)}</div>
                </>
              ) : <span style={{ fontSize: 14, color: 'var(--muted)' }}>لم يُحلَّل بعد. اضغط «أعد التحليل».</span>}
            </div>

            {f.synopsis && <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><b style={{ fontSize: 14.5 }}>الملخص</b><p style={{ margin: 0, fontSize: 14, color: 'var(--ink2)', lineHeight: 1.8 }}>{f.synopsis}</p></div>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <b style={{ fontSize: 14.5, marginBottom: 4 }}>لجنة التحكيم</b>
              {f.assignments.length === 0 && <span style={{ fontSize: 13.5, color: 'var(--faint)', padding: '6px 0' }}>ما فيه محكّم بعد.</span>}
              {f.assignments.map((a) => {
                const rv = f.reviews.find((r) => r.reviewer_id === a.reviewer_id);
                return (
                  <div key={a.reviewer_id} className="row" style={{ padding: '9px 0' }}>
                    <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}><span className="av" style={{ margin: 0 }}>{name(a.reviewer_id).slice(0, 1)}</span>{name(a.reviewer_id)}</span>
                    <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <b className="num">{rv?.total != null ? ar(Number(rv.total).toFixed(1)) : a.status === 'in_progress' ? 'يشاهد' : 'لم يبدأ'}</b>
                      {!rv && <button type="button" className="ibtn" style={{ width: 28, height: 28 }} aria-label="إزالة" onClick={() => act('un', () => unassign(f.id, a.reviewer_id))}><Icon name="x" size={13} /></button>}
                    </span>
                  </div>
                );
              })}
              {reviewers.length === 0 ? (
                <a href="/app/jury" className="link" style={{ fontSize: 13.5, marginTop: 6 }}>أضف محكّمين لمهرجانك ←</a>
              ) : (
                <select className="fld" aria-label="أضف محكّمًا" value="" disabled={pending} onChange={(e) => e.target.value && act('as', () => assign(f.id, e.target.value), 'تم الإسناد')} style={{ height: 42, marginTop: 8, fontSize: 14 }}>
                  <option value="">+ أضف محكّمًا{f.analysis?.suggested_reviewer ? ` · المقترح: ${name(f.analysis.suggested_reviewer)} ✦` : ''}</option>
                  {reviewers.filter((r) => !f.assignments.some((a) => a.reviewer_id === r.user_id)).map((r) => <option key={r.user_id} value={r.user_id}>{r.name}{r.specialty ? ` · ${r.specialty}` : ''}</option>)}
                </select>
              )}
              {f.reviews.filter((r) => r.notes).map((r) => <p key={r.reviewer_id} style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.7 }}><b style={{ color: 'var(--ink2)' }}>{name(r.reviewer_id)}:</b> «{r.notes}»</p>)}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <b style={{ fontSize: 14.5 }}>الحالة</b>
              <select className="fld" value={f.status} disabled={pending} onChange={(e) => act('st', () => setStatus(f.id, e.target.value))} style={{ height: 42, fontSize: 14 }}>
                {Object.entries(STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <b style={{ fontSize: 14.5 }}>القرار</b>
              <div className="g2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                {Object.entries(DECISION).map(([k, [l, , col]]) => (
                  <button key={k} type="button" aria-pressed={f.decision === k} disabled={pending} onClick={() => act('dec', () => setDecision(f.id, k))}
                    style={{ height: 40, borderRadius: 11, border: `1px solid ${f.decision === k ? col : 'var(--line2)'}`, background: 'transparent', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: f.decision === k ? col : 'var(--ink2)' }}>{l}</button>
                ))}
              </div>
              <span className="hint">{f.decision_published ? 'نُشر القرار لصانع الفيلم.' : 'يصل القرار لصانع الفيلم بالبريد عند نشر القرارات.'}</span>
            </div>
            <button type="button" className="btn btn-g btn-sm" style={{ alignSelf: 'flex-start', color: 'var(--no)' }} onClick={() => confirm('حذف هذه المشاركة نهائيًا؟') && act('del', () => deleteFilm(f.id), 'حُذفت المشاركة')}>حذف المشاركة</button>
          </aside>
        )}
      </div>

      {adding && <AddFilm categories={categories} onClose={() => setAdding(false)} onDone={(ref) => { router.refresh(); flash(`أُضيف ${ref} وحُلّل`); }} />}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}

function AddFilm({ categories, onClose, onDone }: { categories: { id: string; name: string }[]; onClose: () => void; onDone: (ref: string) => void }) {
  const [state, setState] = useState<'form' | 'run' | 'done'>('form');
  const [err, setErr] = useState('');
  const [ref, setRef] = useState('');
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState('run'); setErr('');
    const r = await addFilm(new FormData(e.currentTarget));
    if (!r.ok) { setErr(r.error || 'تعذّر الحفظ'); setState('form'); return; }
    setRef(r.ref || ''); setState('done'); onDone(r.ref || '');
  }
  return (
    <div className="modal-bg" role="dialog" aria-modal="true" aria-label="أضف فيلمًا" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card rise" style={{ width: '100%', maxWidth: 540, padding: 28, borderRadius: 24, display: 'flex', flexDirection: 'column', gap: 18, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h2 style={{ fontSize: 22 }}>أضف فيلمًا</h2><button type="button" className="ibtn" onClick={onClose} aria-label="إغلاق"><Icon name="x" /></button></div>
        {state === 'form' && (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label className="lbl">رابط المشاهدة<input name="url" className="fld" dir="ltr" placeholder="https://vimeo.com/…" /></label>
            <div className="g2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label className="lbl">عنوان الفيلم<input name="title" className="fld" required /></label>
              <label className="lbl">اسم المخرج<input name="director" className="fld" required /></label>
              <label className="lbl">النوع<select name="genre" className="fld"><option value="">—</option><option>روائي</option><option>وثائقي</option><option>تحريك</option><option>تجريبي</option></select></label>
              <label className="lbl">المدة بالدقائق<input name="duration" className="fld num" inputMode="numeric" /></label>
              <label className="lbl">القسم<select name="category" className="fld"><option value="">—</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
              <label className="lbl">بريد المخرج<input name="email" className="fld" dir="ltr" type="email" /></label>
            </div>
            <label className="lbl">الملخص<textarea name="synopsis" className="fld" style={{ height: 96 }} /></label>
            {err && <span className="err">{err}</span>}
            <button className="btn btn-p btn-lg"><Icon name="spark" size={16} />أضف وحلّل</button>
          </form>
        )}
        {state === 'run' && <div style={{ padding: '40px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, color: 'var(--muted)' }}><Spinner size={30} />نقرأ الفيلم ونحلّله…</div>}
        {state === 'done' && (
          <div className="rise" style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', textAlign: 'center', padding: '10px 0' }}>
            <span style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--okT)', color: 'var(--ok)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={24} stroke={2.4} /></span>
            <b style={{ fontSize: 18 }}>أُضيف الفيلم وحُلّل</b><span className="num" style={{ direction: 'ltr', color: 'var(--muted)' }}>{ref}</span>
            <div style={{ display: 'flex', gap: 10, width: '100%' }}><button type="button" className="btn btn-p" style={{ flex: 1 }} onClick={onClose}>تم</button><button type="button" className="btn btn-s" onClick={() => setState('form')}>أضف فيلمًا آخر</button></div>
          </div>
        )}
      </div>
    </div>
  );
}
