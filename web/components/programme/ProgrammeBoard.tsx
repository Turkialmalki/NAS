'use client';
import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { addVenue, deleteVenue, saveScreenings, deleteScreening, setProgrammePublished } from '@/app/app/programme/actions';
import { autoSchedule, conflictsFor, hhmm, local, nextFree, parseHhmm, toIso, type Film, type Screening, type Venue } from '@/lib/programme';
import { useT } from '../Lang';
import { Icon, Spinner } from '../Icon';

type PFilm = Film & { decision: string };
const START = 10 * 60, END = 24 * 60, SPAN = END - START;

export function ProgrammeBoard({ venues, screenings, films, days, hasDates, published, slug, auto }: {
  venues: Venue[]; screenings: Screening[]; films: PFilm[]; days: string[]; hasDates: boolean; published: boolean; slug: string; auto: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [day, setDay] = useState(days[0]);
  const [edit, setEdit] = useState<Partial<Screening> & { submission_id: string } | null>(null);
  const [proposal, setProposal] = useState<{ plan: Screening[]; left: Film[] } | null>(null);
  const [venueForm, setVenueForm] = useState(false);
  const [toast, setToast] = useState('');
  const byId = useMemo(() => new Map(films.map((f) => [f.id, f])), [films]);
  const scheduled = new Set(screenings.map((s) => s.submission_id));
  const waiting = films.filter((f) => !scheduled.has(f.id));
  const accepted = waiting.filter((f) => f.decision === 'accepted');
  const todays = screenings.filter((s) => local(s.starts_at).day === day);
  const say = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2800); };
  const run = (fn: () => Promise<{ ok: boolean; error?: string; clash?: string }>, ok: string, after?: () => void) => start(async () => {
    const r = await fn();
    if (r.ok) { say(ok); after?.(); router.refresh(); }
    else say(r.error === 'clash' ? t('يتعارض مع عرض «{f}» في القاعة نفسها.', { f: r.clash || '' }) : t('تعذّر الحفظ، حاول مرة أخرى.'));
  });
  const propose = () => {
    const pool = accepted.length ? accepted : waiting;
    if (!venues.length) { setVenueForm(true); say(t('أضف قاعة واحدة على الأقل أولًا.')); return; }
    if (!pool.length) { say(t('لا توجد أفلام مقبولة بانتظار الجدولة.')); return; }
    setProposal(autoSchedule(pool, venues, days, screenings));
  };
  useEffect(() => { if (auto) propose(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 30 }}>{t('جدول العروض')}</h1>
          <p style={{ margin: '8px 0 0', color: 'var(--muted)', fontSize: 15.5 }}>
            {screenings.length ? t('{s} عرض في {v} قاعات على {d} أيام', { s: screenings.length, v: venues.length, d: days.length }) : t('رتّب عروض الأفلام المقبولة على القاعات والأيام.')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="button" className={`switch ${published ? 'on' : ''}`} role="switch" aria-checked={published} disabled={pending || !screenings.length}
            onClick={() => run(() => setProgrammePublished(!published), published ? t('أُخفي البرنامج عن الجمهور') : t('نُشر البرنامج على صفحة المهرجان'))}>
            <span className="knob" />{published ? t('منشور') : t('غير منشور')}
          </button>
          {published && <Link href={`/f/${slug}#programme`} target="_blank" className="btn btn-s btn-sm"><Icon name="globe" size={15} />{t('الصفحة العامة')}</Link>}
          <button type="button" className="btn btn-p btn-sm" onClick={propose}><Icon name="spark" size={15} />{t('اقترح جدولًا')}</button>
        </div>
      </div>

      {!hasDates && <div className="card note"><Icon name="cal" size={16} />{t('لم تحدّد تواريخ المهرجان بعد، فعرضنا الأيام الثلاثة القادمة.')} <Link href="/app/settings" className="link">{t('حدّد التواريخ')}</Link></div>}

      <div className="prog-grid">
        <div className="card" style={{ padding: 0, overflow: 'hidden', minWidth: 0 }}>
          <div className="prog-bar">
            <div className="seg" role="tablist">
              {days.map((d, i) => (
                <button key={d} type="button" role="tab" aria-selected={d === day} className={d === day ? 'on' : ''} onClick={() => setDay(d)}>
                  <span style={{ fontSize: 11.5, opacity: 0.7 }}>{t('اليوم {n}', { n: i + 1 })}</span><b>{t.day(`${d}T12:00:00Z`)}</b>
                </button>
              ))}
            </div>
            <button type="button" className="btn btn-q btn-sm" onClick={() => setVenueForm(true)}><Icon name="plus" size={15} />{t('قاعة')}</button>
          </div>
          {venues.length === 0 ? (
            <div className="empty" style={{ padding: '56px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <span className="drop-ic"><Icon name="grid" size={22} /></span>
              <b style={{ color: 'var(--ink)', fontSize: 17 }}>{t('أضف قاعات العرض')}</b>
              <span>{t('بعدها يقترح NAS جدولًا كاملًا بلا تعارضات.')}</span>
              <button type="button" className="btn btn-p btn-sm" onClick={() => setVenueForm(true)}>{t('أضف أول قاعة')}</button>
            </div>
          ) : (
            <div className="tl" style={{ ['--span' as string]: SPAN }}>
              <div className="tl-hours">
                <span className="tl-v" />
                <span className="tl-track">{Array.from({ length: SPAN / 60 + 1 }, (_, i) => <span key={i} className="tl-h num" style={{ insetInlineStart: `${(i * 60 / SPAN) * 100}%` }}>{t.n(hhmm(START + i * 60).replace(/^0/, ''))}</span>)}</span>
              </div>
              {venues.map((v) => (
                <div key={v.id} className="tl-row">
                  <span className="tl-v">
                    <b>{v.name}</b>{v.capacity ? <span className="num">{t('{n} مقعد', { n: v.capacity })}</span> : null}
                    <button type="button" className="tl-del" aria-label={t('احذف القاعة')} onClick={() => { if (confirm(t('حذف القاعة يحذف عروضها أيضًا. متأكد؟'))) run(() => deleteVenue(v.id), t('حُذفت القاعة')); }}><Icon name="trash" size={13} /></button>
                  </span>
                  <span className="tl-track">
                    {Array.from({ length: SPAN / 60 }, (_, i) => <span key={i} className="tl-grid" style={{ insetInlineStart: `${(i * 60 / SPAN) * 100}%` }} />)}
                    {todays.filter((s) => s.venue_id === v.id).map((s) => {
                      const m = local(s.starts_at).min; const f = byId.get(s.submission_id);
                      const from = Math.max(m, START), w = Math.max(18, Math.min(m + s.duration_min, END) - from);
                      return (
                        <button key={s.id} type="button" className="tl-b" title={`${f?.title || ''} · ${hhmm(m)}`} onClick={() => setEdit(s)}
                          style={{ insetInlineStart: `${((from - START) / SPAN) * 100}%`, width: `${(w / SPAN) * 100}%` }}>
                          <b>{f?.title || '—'}</b><span className="num">{t.n(hhmm(m))}</span>
                        </button>
                      );
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
          <b style={{ fontSize: 15.5 }}>{t('بانتظار الجدولة')} <span className="num" style={{ color: 'var(--faint)', fontWeight: 400 }}>{t.n(waiting.length)}</span></b>
          {waiting.length === 0 ? (
            <span style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.8 }}>{films.length ? t('كل الأفلام المقبولة مجدولة.') : t('تظهر هنا الأفلام بعد قبولها أو إضافتها للقائمة القصيرة.')}</span>
          ) : waiting.map((f) => (
            <div key={f.id} className="wait-i">
              <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <b style={{ fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.title}</b>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{[f.duration_min ? t('{n} د', { n: f.duration_min }) : null, f.category, f.decision === 'shortlisted' ? t('قائمة قصيرة') : null].filter(Boolean).join(' · ')}</span>
              </span>
              <button type="button" className="btn btn-q btn-sm" disabled={!venues.length} onClick={() => {
                const dur = f.duration_min || 20; let at: { v: string; m: number } | null = null;
                for (const v of venues) { const m = nextFree(v.id, day, dur, screenings); if (m != null) { at = { v: v.id, m }; break; } }
                setEdit({ submission_id: f.id, venue_id: at?.v || venues[0]?.id, starts_at: toIso(day, at?.m ?? 18 * 60), duration_min: dur });
              }}>{t('جدولة')}</button>
            </div>
          ))}
        </div>
      </div>

      {edit && <EditScreening s={edit} film={byId.get(edit.submission_id)} venues={venues} days={days} all={screenings.map((x) => ({ ...x, title: byId.get(x.submission_id)?.title }))} busy={pending} onClose={() => setEdit(null)}
        onSave={(x) => run(() => saveScreenings([x]), t('حُفظ العرض'), () => setEdit(null))}
        onDelete={edit.id ? () => run(() => deleteScreening(edit.id!), t('أُزيل العرض من البرنامج'), () => setEdit(null)) : undefined} />}

      {proposal && (
        <div className="modal-bg" role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && !pending && setProposal(null)}>
          <div className="card rise" style={{ width: '100%', maxWidth: 620, padding: 28, borderRadius: 26, display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ color: 'var(--acc)' }}><Icon name="spark" size={20} /></span><h2 style={{ fontSize: 22 }} className="display">{t('جدول مقترح')}</h2></div>
            <span style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.8 }}>{t('رتّبنا {n} فيلم على {d} أيام: أفلام القسم الواحد متتالية، والعروض موزّعة بالتساوي على الأيام والقاعات، مع {b} دقيقة بين كل عرضين.', { n: proposal.plan.length, d: new Set(proposal.plan.map((p) => local(p.starts_at).day)).size, b: 15 })}</span>
            {days.map((d) => {
              const xs = proposal.plan.filter((p) => local(p.starts_at).day === d).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
              if (!xs.length) return null;
              return (
                <div key={d} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span className="eyebrow">{t.day(`${d}T12:00:00Z`)}</span>
                  {xs.map((p) => (
                    <div key={p.id} className="row" style={{ fontSize: 14 }}>
                      <span style={{ display: 'flex', gap: 12 }}><b className="num" style={{ minWidth: 48 }}>{t.n(hhmm(local(p.starts_at).min))}</b><span>{p.title}</span></span>
                      <span style={{ color: 'var(--muted)', fontSize: 13 }}>{venues.find((v) => v.id === p.venue_id)?.name}</span>
                    </div>
                  ))}
                </div>
              );
            })}
            {proposal.left.length > 0 && <span className="err">{t('لم يتسع الوقت لـ {n} فيلم. أضف قاعة أو يومًا.', { n: proposal.left.length })}</span>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn btn-p" style={{ flex: 1 }} disabled={pending || !proposal.plan.length}
                onClick={() => run(() => saveScreenings(proposal.plan.map(({ submission_id, venue_id, starts_at, duration_min }) => ({ submission_id, venue_id, starts_at, duration_min }))), t('اعتُمد الجدول'), () => setProposal(null))}>
                {pending ? <Spinner size={16} /> : <Icon name="check" size={16} />}{t('اعتمد الجدول')}
              </button>
              <button type="button" className="btn btn-s" onClick={() => setProposal(null)}>{t('إلغاء')}</button>
            </div>
          </div>
        </div>
      )}

      {venueForm && <VenueForm busy={pending} onClose={() => setVenueForm(false)} onSave={(n, c) => run(() => addVenue(n, c), t('أُضيفت القاعة'), () => setVenueForm(false))} />}
      {toast && <div className="toast" role="status">{t(toast)}</div>}
    </>
  );
}

function EditScreening({ s, film, venues, days, all, busy, onClose, onSave, onDelete }: {
  s: Partial<Screening> & { submission_id: string }; film?: Film; venues: Venue[]; days: string[]; all: Screening[]; busy: boolean;
  onClose: () => void; onSave: (x: { id?: string; submission_id: string; venue_id: string; starts_at: string; duration_min: number }) => void; onDelete?: () => void;
}) {
  const t = useT();
  const l0 = s.starts_at ? local(s.starts_at) : { day: days[0], min: 18 * 60 };
  const [venue, setVenue] = useState(s.venue_id || venues[0]?.id || '');
  const [day, setDay] = useState(days.includes(l0.day) ? l0.day : l0.day);
  const [time, setTime] = useState(hhmm(l0.min));
  const [dur, setDur] = useState(String(s.duration_min || film?.duration_min || 20));
  const m = parseHhmm(time), d = Number(dur);
  const valid = m != null && d >= 1 && d <= 600 && !!venue;
  const iso = valid ? toIso(day, m!) : '';
  const clash = valid ? conflictsFor({ id: s.id, venue_id: venue, starts_at: iso, duration_min: d }, all) : [];
  const dayList = days.includes(day) ? days : [day, ...days];
  return (
    <div className="modal-bg" role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="card rise" style={{ width: '100%', maxWidth: 480, padding: 26, borderRadius: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 21 }} className="display">{film?.title || t('عرض')}</h2>
          <button type="button" className="ibtn" onClick={onClose} aria-label={t('إغلاق')}><Icon name="x" /></button>
        </div>
        <label className="lbl">{t('القاعة')}<select className="fld" value={venue} onChange={(e) => setVenue(e.target.value)}>{venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></label>
        <label className="lbl">{t('يوم العرض')}<select className="fld" value={day} onChange={(e) => setDay(e.target.value)}>{dayList.map((x) => <option key={x} value={x}>{t.day(`${x}T12:00:00Z`)}</option>)}</select></label>
        <div className="g2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          <label className="lbl">{t('وقت البداية')}<input className="fld num" type="time" value={time} onChange={(e) => setTime(e.target.value)} dir="ltr" /></label>
          <label className="lbl">{t('المدة (دقيقة)')}<input className="fld num" inputMode="numeric" value={dur} onChange={(e) => setDur(e.target.value.replace(/\D/g, '').slice(0, 3))} dir="ltr" /></label>
        </div>
        {clash.length > 0 ? <span className="err" role="alert">{t('يتعارض مع عرض «{f}» في القاعة نفسها.', { f: clash[0].title || '' })}</span>
          : valid && <span className="hint" style={{ color: 'var(--ok)' }}>✓ {t('الوقت متاح، وينتهي العرض {e}', { e: t.n(hhmm(m! + d)) })}</span>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="btn btn-p" style={{ flex: 1 }} disabled={busy || !valid || clash.length > 0} onClick={() => onSave({ id: s.id, submission_id: s.submission_id, venue_id: venue, starts_at: iso, duration_min: d })}>{busy ? <Spinner size={16} /> : null}{t('حفظ')}</button>
          {onDelete && <button type="button" className="btn btn-s" disabled={busy} onClick={onDelete} style={{ color: 'var(--no)' }}><Icon name="trash" size={15} />{t('إزالة')}</button>}
        </div>
      </div>
    </div>
  );
}

function VenueForm({ busy, onClose, onSave }: { busy: boolean; onClose: () => void; onSave: (n: string, c: number | null) => void }) {
  const t = useT();
  const [n, setN] = useState(''); const [c, setC] = useState('');
  const ok = n.trim().length >= 2;
  return (
    <div className="modal-bg" role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <form className="card rise" style={{ width: '100%', maxWidth: 420, padding: 26, borderRadius: 24, display: 'flex', flexDirection: 'column', gap: 14 }}
        onSubmit={(e) => { e.preventDefault(); if (ok) onSave(n.trim(), c ? Number(c) : null); }}>
        <h2 style={{ fontSize: 21 }} className="display">{t('قاعة جديدة')}</h2>
        <label className="lbl">{t('اسم القاعة')}<input className="fld" autoFocus value={n} onChange={(e) => setN(e.target.value)} placeholder={t('مثال: القاعة الكبرى')} maxLength={80} /></label>
        <label className="lbl">{t('عدد المقاعد (اختياري)')}<input className="fld num" inputMode="numeric" value={c} onChange={(e) => setC(e.target.value.replace(/\D/g, '').slice(0, 5))} dir="ltr" /></label>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="submit" className="btn btn-p" style={{ flex: 1 }} disabled={busy || !ok}>{busy ? <Spinner size={16} /> : null}{t('أضف القاعة')}</button>
          <button type="button" className="btn btn-s" onClick={onClose}>{t('إلغاء')}</button>
        </div>
      </form>
    </div>
  );
}
