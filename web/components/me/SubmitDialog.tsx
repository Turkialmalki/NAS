'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { submitProject } from '@/app/app/me/actions';
import { bestCategory, type RecFestival } from '@/lib/recommend';
import type { MyFilm } from '@/lib/me';
import { useT } from '../Lang';
import { Icon, Spinner } from '../Icon';

/** Submit one of my films to a festival: pick film, category, confirm. */
export function SubmitDialog({ films, festivals, filmId, festivalId, onClose }: { films: MyFilm[]; festivals: RecFestival[]; filmId?: string; festivalId?: string; onClose: () => void }) {
  const t = useT();
  const router = useRouter();
  const [fid, setFid] = useState(filmId || films[0]?.id || '');
  const [fest, setFest] = useState(festivalId || festivals[0]?.id || '');
  const film = films.find((f) => f.id === fid);
  const festival = festivals.find((f) => f.id === fest);
  const best = useMemo(() => (film && festival ? bestCategory({ id: film.id, title: film.title, genre: film.genre, duration_min: film.duration_min }, festival) : null), [film, festival]);
  const [cat, setCat] = useState<string | null>(null);
  const chosen = cat || best?.id || null;
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState<string | null>(null);
  const noScreener = film && !film.screener_path && !film.screener_url;

  async function go() {
    if (!film || !festival) return;
    if (noScreener) { setErr(t('أضف نسخة مشاهدة للفيلم أولًا (ملف أو رابط).')); return; }
    if (festival.categories.length && !chosen) { setErr(t('اختر القسم.')); return; }
    if (!agree) { setErr(t('وافق على شروط المهرجان.')); return; }
    setBusy(true); setErr('');
    const r = await submitProject(film.id, festival.id, chosen);
    setBusy(false);
    if (!r.ok) { setErr(t(r.error === 'duplicate' ? 'قدّمت هذا الفيلم لهذا المهرجان من قبل.' : r.error === 'closed' ? 'التقديم مغلق لهذا المهرجان.' : r.error === 'no_screener' ? 'أضف نسخة مشاهدة للفيلم أولًا (ملف أو رابط).' : 'تعذّر الإرسال، حاول مرة أخرى.')); return; }
    setDone(r.ref || ''); router.refresh();
  }

  return (
    <div className="modal-bg" role="dialog" aria-modal="true" aria-label={t('قدّم فيلمك')} onClick={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="card rise" style={{ width: '100%', maxWidth: 560, padding: 28, borderRadius: 26, display: 'flex', flexDirection: 'column', gap: 18, maxHeight: '92vh', overflowY: 'auto' }}>
        {done ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center', padding: '10px 0' }}>
            <span className="done-ic"><Icon name="check" size={28} stroke={2.4} /></span>
            <h2 style={{ fontSize: 26 }} className="display">{t('وصل فيلمك')}</h2>
            <span style={{ color: 'var(--muted)', lineHeight: 1.8 }}>{t('«{film}» الآن عند {festival}، وتصلك النتيجة هنا وعلى بريدك.', { film: film?.title || '', festival: festival?.name || '' })}</span>
            <b className="num" style={{ fontSize: 22, direction: 'ltr' }}>{done}</b>
            <button type="button" className="btn btn-p" style={{ minWidth: 200 }} onClick={onClose}>{t('تم')}</button>
          </div>
        ) : <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 24 }} className="display">{t('قدّم فيلمك')}</h2>
            <button type="button" className="ibtn" onClick={onClose} aria-label={t('إغلاق')}><Icon name="x" /></button>
          </div>
          {films.length === 0 ? (
            <div className="empty" style={{ padding: 20 }}>{t('أضف فيلمًا أولًا.')} <Link href="/app/me/films/new" className="link">{t('أضف فيلمًا')}</Link></div>
          ) : <>
            <label className="lbl">{t('الفيلم')}
              <select className="fld" value={fid} onChange={(e) => { setFid(e.target.value); setCat(null); }}>{films.map((f) => <option key={f.id} value={f.id}>{f.title}</option>)}</select>
            </label>
            <label className="lbl">{t('المهرجان')}
              <select className="fld" value={fest} onChange={(e) => { setFest(e.target.value); setCat(null); }}>{festivals.map((f) => <option key={f.id} value={f.id}>{f.name}{f.city ? ` · ${f.city}` : ''}</option>)}</select>
            </label>
            {festival && festival.categories.length > 0 && (
              <div className="lbl">{t('القسم')}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {festival.categories.map((c) => (
                    <button key={c.id} type="button" className={`choice ${chosen === c.id ? 'on' : ''}`} onClick={() => setCat(c.id)} aria-pressed={chosen === c.id}>
                      <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}><b style={{ fontSize: 14.5 }}>{c.name}</b><span style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 400 }}>{[c.description, c.fee].filter(Boolean).join(' · ')}</span></span>
                      {best?.id === c.id && <span className="chip c-acc">✦ {t('الأنسب لفيلمك')}</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {noScreener && <span className="err">{t('هذا الفيلم بلا نسخة مشاهدة.')} <Link href={`/app/me/films/${fid}`} className="link">{t('أضفها الآن')}</Link></span>}
            <button type="button" onClick={() => setAgree(!agree)} aria-pressed={agree} className="check-row">
              <span className={`check ${agree ? 'on' : ''}`}>{agree && <Icon name="check" size={12} stroke={3.4} />}</span>{t('قرأت شروط المهرجان وأوافق عليها.')}
            </button>
            {err && <span className="err" role="alert">{t(err)}</span>}
            <button type="button" className="btn btn-p btn-lg" disabled={busy} onClick={go}>{busy ? <><Spinner size={16} />{t('نرسل ونحلّل فيلمك…')}</> : t('أرسل المشاركة')}</button>
            <span className="hint" style={{ textAlign: 'center' }}>{t('نرسل بيانات فيلمك وتحليله. لا ننقل أي حقوق عرض أو توزيع.')}</span>
          </>}
        </>}
      </div>
    </div>
  );
}
