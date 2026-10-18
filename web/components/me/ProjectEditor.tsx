'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { saveProject, deleteProject, type ProjectInput } from '@/app/app/me/actions';
import type { VideoAnalysis } from '@/lib/videoAnalysis';
import type { RecFestival } from '@/lib/recommend';
import type { MyFilm, MySub } from '@/lib/me';
import { completeness } from '@/lib/recommend';
import { VideoIntake } from '../video/VideoIntake';
import { VideoReport } from '../video/VideoReport';
import { useT } from '../Lang';
import { Icon, Spinner } from '../Icon';
import { SubmitDialog } from './SubmitDialog';
import { Readiness, Stages } from './MeHome';

const GENRES = ['روائي', 'وثائقي', 'تحريك', 'تجريبي'];
const LANGS = ['العربية', 'الإنجليزية', 'أخرى'];
const COUNTRIES = ['السعودية', 'الإمارات', 'مصر', 'الأردن', 'لبنان', 'الكويت', 'قطر', 'البحرين', 'عُمان', 'المغرب', 'تونس', 'العراق', 'أخرى'];

type P = Omit<ProjectInput, 'duration_min' | 'year'> & { duration_min: string; year: string };

export function ProjectEditor({ userId, project, video, festivals = [], subs = [] }: {
  userId: string; project?: (ProjectInput & { id: string }) | null; video?: VideoAnalysis | null; festivals?: RecFestival[]; subs?: MySub[];
}) {
  const t = useT();
  const router = useRouter();
  const [p, setP] = useState<P>({
    id: project?.id, title: project?.title || '', director: project?.director || '', synopsis: project?.synopsis || '', logline: project?.logline || '', genre: project?.genre || '',
    duration_min: project?.duration_min ? String(project.duration_min) : '', language: project?.language || 'العربية', country: project?.country || 'السعودية',
    year: project?.year ? String(project.year) : String(new Date().getFullYear()), screener_url: project?.screener_url || '', screener_path: project?.screener_path || null,
  });
  const [report, setReport] = useState<{ r: VideoAnalysis; sig: string } | null>(null);
  const [replacing, setReplacing] = useState(!project?.screener_path && !project?.screener_url);
  const [useLink, setUseLink] = useState(!!project?.screener_url && !project?.screener_path);
  const [filled, setFilled] = useState<string[]>([]);
  const [fe, setFe] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [submit, setSubmit] = useState(false);
  const [started, setStarted] = useState(!!project); // a new film starts with the upload; details follow
  const set = (k: keyof P) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setP((x) => ({ ...x, [k]: e.target.value }));
  const tag = (k: string) => (filled.includes(k) ? <span className="chip c-acc" style={{ height: 20, fontSize: 11, padding: '0 7px' }}>✦ {t('من الفيلم')}</span> : null);
  const cls = (k: string) => `fld${filled.includes(k) ? ' filled' : ''}`;
  const bad = (k: string) => (fe[k] ? { borderColor: 'var(--no)' } : undefined);
  const E = ({ k }: { k: string }) => (fe[k] ? <span className="err">{t(fe[k])}</span> : null);
  const shown = report ? null : video || null; // a fresh report is already shown inside the uploader
  const c = completeness({ ...p, duration_min: Number(p.duration_min) || null, has_video: !!(report || video) });

  function onReport(r: VideoAnalysis | null, sig: string | null) {
    setReport(r && sig ? { r, sig } : null);
    if (!r) return;
    const got: string[] = [];
    setP((x) => {
      const n = { ...x };
      if (!x.title.trim() && r.title_guess) { n.title = r.title_guess; got.push('title'); }
      if (!x.genre && r.genre_guess) { n.genre = r.genre_guess; got.push('genre'); }
      if (r.language_guess && LANGS.includes(r.language_guess) && x.language !== r.language_guess && !project) { n.language = r.language_guess; got.push('language'); }
      if (!x.synopsis.trim() && r.synopsis_draft) { n.synopsis = r.synopsis_draft; got.push('synopsis'); }
      if (!x.logline?.trim() && r.logline) { n.logline = r.logline; got.push('logline'); }
      return n;
    });
    setFilled((x) => [...new Set([...x, ...got])]);
  }

  async function save() {
    const e: Record<string, string> = {};
    if (p.title.trim().length < 2) e.title = t('اكتب عنوان الفيلم.');
    if (p.director.trim().length < 2) e.director = t('اكتب اسم المخرج.');
    const d = Number(p.duration_min);
    if (p.duration_min && !(Number.isInteger(d) && d >= 1 && d <= 600)) e.duration_min = t('المدة رقم بين 1 و600 دقيقة.');
    const y = Number(p.year);
    if (p.year && !(y >= 1900 && y <= new Date().getFullYear() + 1)) e.year = t('سنة غير صحيحة.');
    if (useLink && p.screener_url && !/^https?:\/\/\S+\.\S{2,}/i.test(p.screener_url)) e.screener_url = t('الرابط غير صحيح. يبدأ بـ https://');
    if (!useLink && replacing && report && !p.screener_path) e.media = t('انتظر حتى يكتمل رفع الفيلم.');
    setFe(e);
    if (Object.keys(e).length) { setMsg(t('راجع الحقول المظللة.')); return; }
    setBusy(true); setMsg('');
    const r = await saveProject({
      ...p, duration_min: p.duration_min ? d : null, year: p.year ? y : null,
      screener_url: useLink ? p.screener_url || null : null, screener_path: useLink ? null : p.screener_path,
      ...(report ? { video: report.r, video_sig: report.sig } : {}),
    });
    setBusy(false);
    if (!r.ok) { setMsg(t('تعذّر الحفظ، حاول مرة أخرى.')); return; }
    if (!project) router.replace(`/app/me/films/${r.id}?saved=1`); else { setMsg(t('حُفظت التغييرات ✓')); setReport(null); setReplacing(false); setFilled([]); router.refresh(); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 980, width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link href="/app/me/films" className="ibtn" aria-label={t('رجوع')}><Icon name="arrow" size={17} className="back" /></Link>
          <h1 style={{ fontSize: 30 }}>{project ? p.title || t('فيلمي') : t('فيلم جديد')}</h1>
        </span>
        {project && <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Readiness pct={c.pct} size={40} />
          <button type="button" className="btn btn-p" onClick={() => setSubmit(true)} disabled={!festivals.length}><Icon name="spark" size={15} />{t('قدّم لمهرجان')}</button>
        </span>}
      </div>

      <div className="card" style={{ padding: 24, borderRadius: 24, display: 'flex', flexDirection: 'column', gap: 14, ...(fe.media ? { borderColor: 'var(--no)' } : {}) }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <b style={{ fontSize: 17 }}>{t('نسخة المشاهدة')}</b>
          <div className="seg" role="group"><button type="button" className={!useLink ? 'on' : ''} onClick={() => setUseLink(false)}>✦ {t('رفع الفيلم')}</button><button type="button" className={useLink ? 'on' : ''} onClick={() => { setUseLink(true); setStarted(true); }}>{t('رابط مشاهدة')}</button></div>
        </div>
        {useLink ? (
          <label className="lbl"><input className="fld" dir="ltr" value={p.screener_url || ''} onChange={set('screener_url')} placeholder="https://vimeo.com/…" style={bad('screener_url')} /><E k="screener_url" /></label>
        ) : !replacing && p.screener_path ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, background: 'var(--s2)' }}>
            <span className="drop-ic" style={{ width: 40, height: 40 }}><Icon name="film" size={18} /></span>
            <span style={{ flex: 1, fontSize: 14 }}>{t('الفيلم مرفوع ومحفوظ بأمان.')}</span>
            <button type="button" className="btn btn-g btn-sm" onClick={() => setReplacing(true)}>{t('استبدل الملف')}</button>
          </div>
        ) : (
          <VideoIntake folder={`projects/${userId}`} festivalId="" ctx={() => ({ title: p.title, synopsis: p.synopsis, genre: p.genre })}
            onUploaded={(path) => { setStarted(true); setP((x) => ({ ...x, screener_path: path })); }} onReport={(r, sig) => { setStarted(true); onReport(r, sig); }}
            onDuration={(m) => { setStarted(true); setP((x) => ({ ...x, duration_min: String(m) })); setFilled((x) => [...new Set([...x, 'duration_min'])]); }}
            onUseSynopsis={(s) => setP((x) => ({ ...x, synopsis: s }))} />
        )}
        <E k="media" />
      </div>

      {!started && <button type="button" className="nf-more" onClick={() => setStarted(true)}>{t('أضف البيانات يدويًا بدون ملف الآن')}</button>}
      {started && <>
      {filled.length > 0 && <div className="rise" style={{ padding: '12px 16px', borderRadius: 14, background: 'var(--accT)', border: '1px solid var(--accL)', fontSize: 14 }}>✦ {t('عبّأ NAS Vision {n} حقول من الفيلم. راجعها ثم احفظ.', { n: filled.length })}</div>}

      <div className="card" style={{ padding: 24, borderRadius: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <b style={{ fontSize: 17 }}>{t('بيانات الفيلم')}</b>
        <div className="g2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
          <label className="lbl"><span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{t('عنوان الفيلم')} <b style={{ color: 'var(--no)' }}>*</b>{tag('title')}</span><input className={cls('title')} value={p.title} onChange={set('title')} maxLength={200} style={bad('title')} /><E k="title" /></label>
          <label className="lbl"><span>{t('اسم المخرج')} <b style={{ color: 'var(--no)' }}>*</b></span><input className="fld" value={p.director} onChange={set('director')} maxLength={200} style={bad('director')} /><E k="director" /></label>
          <label className="lbl"><span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{t('النوع')}{tag('genre')}</span><select className={cls('genre')} value={p.genre} onChange={set('genre')}><option value="">{t('اختر')}</option>{GENRES.map((g) => <option key={g} value={g}>{t(g)}</option>)}</select></label>
          <label className="lbl"><span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{t('المدة بالدقائق')}{tag('duration_min')}</span><input className={`${cls('duration_min')} num`} inputMode="numeric" value={p.duration_min} onChange={(e) => setP((x) => ({ ...x, duration_min: e.target.value.replace(/\D/g, '').slice(0, 3) }))} style={bad('duration_min')} /><E k="duration_min" /></label>
          <label className="lbl"><span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{t('لغة الفيلم')}{tag('language')}</span><select className={cls('language')} value={p.language} onChange={set('language')}>{LANGS.map((g) => <option key={g} value={g}>{t(g)}</option>)}</select></label>
          <label className="lbl">{t('بلد الإنتاج')}<select className="fld" value={p.country} onChange={set('country')}>{COUNTRIES.map((g) => <option key={g} value={g}>{t(g)}</option>)}</select></label>
          <label className="lbl">{t('سنة الإنتاج')}<input className="fld num" inputMode="numeric" value={p.year} onChange={(e) => setP((x) => ({ ...x, year: e.target.value.replace(/\D/g, '').slice(0, 4) }))} style={bad('year')} /><E k="year" /></label>
          <label className="lbl"><span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{t('الفكرة في سطر')}{tag('logline')}</span><input className={cls('logline')} value={p.logline || ''} onChange={set('logline')} maxLength={300} placeholder={t('جملة واحدة تلخّص فيلمك')} /></label>
        </div>
        <label className="lbl"><span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{t('الملخص')}{tag('synopsis')}<span className="hint num" style={{ marginInlineStart: 'auto' }}>{t.n(p.synopsis.length)}/{t.n(2000)}</span></span>
          <textarea className={cls('synopsis')} value={p.synopsis} onChange={set('synopsis')} maxLength={2000} placeholder={t('اكتب قصة فيلمك في سطرين إلى خمسة أسطر.')} style={{ height: 130 }} />
        </label>
        {msg && <span className={msg.includes('✓') ? 'hint' : 'err'} style={{ textAlign: 'center', color: msg.includes('✓') ? 'var(--ok)' : undefined }}>{msg}</span>}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          {project ? <button type="button" className="btn btn-g btn-sm" style={{ color: 'var(--no)' }} onClick={async () => { if (confirm(t('حذف هذا الفيلم من مساحتك؟ مشاركاته السابقة تبقى عند المهرجانات.'))) { await deleteProject(project.id); router.replace('/app/me/films'); } }}>{t('حذف الفيلم')}</button> : <span />}
          <button type="button" className="btn btn-p btn-lg" disabled={busy} onClick={save} style={{ minWidth: 200 }}>{busy ? <Spinner size={16} /> : project ? t('احفظ التغييرات') : t('احفظ الفيلم')}</button>
        </div>
      </div>

      </>}

      {project && c.missing.length > 0 && (
        <div className="card" style={{ padding: 18, borderRadius: 20, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Readiness pct={c.pct} />
          <span style={{ fontSize: 14, color: 'var(--ink2)' }}>{t('ليكتمل ملف فيلمك أضف:')} {c.missing.map((m) => t(m)).join(t('، '))}</span>
        </div>
      )}

      {subs.length > 0 && (
        <div className="card" style={{ padding: '8px 20px', borderRadius: 20 }}>
          <b style={{ display: 'block', padding: '12px 0', fontSize: 16 }}>{t('مشاركات هذا الفيلم')}</b>
          {subs.map((s) => (
            <div key={s.id} className="sub-row"><span style={{ flex: 1, minWidth: 160 }}><b style={{ fontSize: 14.5 }}>{s.festival}</b><span style={{ display: 'block', fontSize: 12.5, color: 'var(--muted)' }}>{s.category}</span></span><Stages s={s} /></div>
          ))}
        </div>
      )}

      {shown && (
        <div className="card" style={{ padding: 24, borderRadius: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <b style={{ fontSize: 17 }}>✦ {t('تقرير NAS Vision')}</b>
          <VideoReport r={shown} />
        </div>
      )}
      {submit && project && <SubmitDialog films={[{ ...(project as unknown as MyFilm), duration_min: Number(p.duration_min) || null, poster: null, score: null, themes: [], pct: c.pct, missing: c.missing, updated_at: '', screener_path: p.screener_path, screener_url: p.screener_url }]} festivals={festivals} filmId={project.id} onClose={() => setSubmit(false)} />}
    </div>
  );
}
