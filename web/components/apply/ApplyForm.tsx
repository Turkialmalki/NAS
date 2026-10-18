'use client';

import { useT } from '@/components/Lang';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { VideoIntake } from '../video/VideoIntake';
import type { VideoAnalysis } from '@/lib/videoAnalysis';
import { Icon, Spinner } from '../Icon';

type Cat = { id: string; name: string; description: string | null; fee: string | null };
type Check = { ok: boolean; text: string };

const GENRES = ['روائي', 'وثائقي', 'تحريك', 'تجريبي'];
const LANGS = ['العربية', 'الإنجليزية', 'أخرى'];

function suggestCategory(cats: Cat[], genre: string, dur: number | null) {
  const toN = (s: string) => Number(s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).match(/\d+/)?.[0] || 0);
  let best: Cat | null = null, bestS = -1;
  for (const c of cats) {
    let s = 0; const d = c.description || ''; const n = toN(d);
    if (genre && c.name.includes(genre)) s += 5;
    if (dur && n && /أقل|حتى/.test(d)) s += dur <= n ? 3 : -5;
    if (dur && n && /أكثر/.test(d)) s += dur >= n ? 3 : -5;
    if (/الأول/.test(c.name)) s -= 1;
    if (s > bestS) { bestS = s; best = c; }
  }
  return best?.id || null;
}

export function ApplyForm({ festivalId, categories, rules, resultsOn }: { festivalId: string; categories: Cat[]; rules: string[]; resultsOn: string | null }) {
  const t = useT();
  const [mode, setMode] = useState<'link' | 'file'>('file');
  const [link, setLink] = useState('');
  const [reading, setReading] = useState(false);
  const [detected, setDetected] = useState<{ ok: boolean | null; source?: string } | null>(null);
  const [path, setPath] = useState<string | null>(null);
  const [video, setVideo] = useState<{ r: VideoAnalysis; sig: string } | null>(null);
  const [f, setF] = useState({ title: '', director: '', email: '', duration: '', genre: '', language: 'العربية', synopsis: '' });
  const [cat, setCat] = useState<string | null>(null);
  const [suggested, setSuggested] = useState<string | null>(null);
  const [improving, setImproving] = useState(false);
  const [improved, setImproved] = useState(false);
  const [agree, setAgree] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState<{ ref: string; checks: Check[] } | null>(null);
  const [copied, setCopied] = useState(false);
  const [filled, setFilled] = useState<string[]>([]);
  const [fe, setFe] = useState<Record<string, string>>({});
  const [tried, setTried] = useState(false);

  function validate(v = f) {
    const e: Record<string, string> = {};
    if (mode === 'link') {
      if (!link.trim()) e.media = 'أضف رابط المشاهدة أو ارفع ملف الفيلم.';
      else if (!/^https?:\/\/[^\s.]+\.[^\s]{2,}/i.test(link.trim())) e.media = 'الرابط غير صحيح. يبدأ بـ https://';
    } else if (!path) e.media = video ? 'انتظر حتى يكتمل رفع الفيلم.' : 'ارفع ملف الفيلم.';
    if (v.title.trim().length < 2) e.title = 'اكتب عنوان الفيلم.';
    if (v.director.trim().length < 3) e.director = 'اكتب اسم المخرج كاملًا.';
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v.email.trim())) e.email = 'البريد الإلكتروني غير صحيح.';
    const d = Number(String(v.duration).replace(/[٠-٩]/g, (x) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(x))));
    if (!v.duration) e.duration = 'اكتب مدة الفيلم بالدقائق.';
    else if (!Number.isInteger(d) || d < 1 || d > 600) e.duration = 'المدة رقم بين ١ و٦٠٠ دقيقة.';
    if (!v.genre) e.genre = 'اختر نوع الفيلم.';
    if (v.synopsis.trim().length < 20) e.synopsis = 'اكتب ملخصًا من سطر أو سطرين على الأقل.';
    if (!(cat || suggested)) e.category = 'اختر القسم.';
    if (!agree) e.agree = 'وافق على شروط المهرجان.';
    return e;
  }
  useEffect(() => { if (tried) setFe(validate()); }, [f, link, path, mode, cat, suggested, agree, tried, video]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const v = e.target.value; const next = { ...f, [k]: v }; setF(next);
    if (k === 'genre' || k === 'duration') setSuggested(suggestCategory(categories, next.genre, Number(next.duration) || null));
  };

  async function readLink() {
    if (!link) return;
    setReading(true); setDetected(null);
    const r = await fetch('/api/check-link', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: link }) }).then((x) => x.json()).catch(() => ({ ok: null }));
    setDetected({ ok: r.ok, source: r.source }); setReading(false);
  }

  function onVideo(r: VideoAnalysis | null, sig: string | null) {
    setVideo(r && sig ? { r, sig } : null);
    if (!r) return;
    const got: string[] = [];
    setF((p) => {
      const n = { ...p };
      if (!p.title.trim() && r.title_guess) { n.title = r.title_guess; got.push('title'); }
      if (!p.genre && r.genre_guess) { n.genre = r.genre_guess; got.push('genre'); }
      if (r.language_guess && LANGS.includes(r.language_guess) && p.language === 'العربية' && r.language_guess !== 'العربية') { n.language = r.language_guess; got.push('language'); }
      if (!p.synopsis.trim() && r.synopsis_draft) { n.synopsis = r.synopsis_draft; got.push('synopsis'); }
      const byFit = categories.find((c) => c.name === r.fit[0]?.category)?.id || null;
      const sug = byFit || suggestCategory(categories, n.genre, Number(n.duration) || null);
      if (sug && !cat) { setSuggested(sug); got.push('category'); }
      return n;
    });
    setFilled((x) => [...new Set([...x, ...got])]);
  }
  function onDuration(mins: number) {
    setF((p) => { const n = { ...p, duration: String(mins) }; setSuggested(suggestCategory(categories, n.genre, mins)); return n; });
    setFilled((x) => [...new Set([...x, 'duration'])]);
  }

  async function improve() {
    if (!f.synopsis.trim()) return;
    setImproving(true);
    const r = await fetch('/api/improve', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: f.synopsis }) }).then((x) => x.json()).catch(() => null);
    if (r?.text) { setF((p) => ({ ...p, synopsis: r.text })); setImproved(true); }
    setImproving(false);
  }

  async function send() {
    setErr(''); setTried(true);
    const e = validate(); setFe(e);
    if (Object.keys(e).length) {
      setErr(t('أكمل {v0} قبل الإرسال.', { v0: Object.keys(e).length === 1 ? 'الحقل المطلوب' : `${t.n(Object.keys(e).length)} حقول مطلوبة` }));
      document.querySelector(`[data-f="${Object.keys(e)[0]}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setSending(true);
    const r = await fetch('/api/submit', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ festival_id: festivalId, category_id: cat || suggested, title: f.title, director: f.director, email: f.email, duration: String(f.duration).replace(/[٠-٩]/g, (x) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(x))),
        genre: f.genre, language: f.language, synopsis: f.synopsis, screener_url: mode === 'link' ? link : null, screener_path: mode === 'file' ? path : null,
        video_report: mode === 'file' ? video?.r : null, video_sig: mode === 'file' ? video?.sig : null }),
    }).then((x) => x.json()).catch(() => ({ error: 'failed' }));
    setSending(false);
    if (r.error) { setErr(r.error === 'festival_closed' ? t('التقديم مغلق لهذا المهرجان.') : r.error === 'invalid_input' ? t('تحقق من البيانات المدخلة.') : t('تعذّر الإرسال، حاول مرة أخرى.')); return; }
    setDone({ ref: r.ref_code, checks: r.checks || [] });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (done) {
    return (
      <div className="rise" style={{ maxWidth: 600, margin: '20px auto 0', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center' }}>
        <span style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--okT)', color: 'var(--ok)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={30} stroke={2.4} /></span>
        <h2 style={{ fontSize: 34 }}>{t('وصلت مشاركتك')}</h2>
        <p style={{ margin: 0, color: 'var(--muted)', fontSize: 16.5, lineHeight: 1.85 }}>{t('هذا رقمك المرجعي، احتفظ به لتتابع مشاركتك.')}{resultsOn ? t(' تُعلن النتائج في {v0}.', { v0: t.date(resultsOn) }) : ''}</p>
        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, borderRadius: 18 }}>
          <b className="num" style={{ fontSize: 24, direction: 'ltr' }}>{done.ref}</b>
          <button type="button" className="btn btn-q btn-sm" onClick={() => { navigator.clipboard?.writeText(done.ref); setCopied(true); }}>{copied ? t('نُسخ ✓') : t('انسخ')}</button>
        </div>
        {done.checks.length > 0 && (
          <div className="card" style={{ width: '100%', padding: '20px 22px', borderRadius: 18, textAlign: 'start', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <b style={{ fontSize: 15 }}>{t('فحص الجاهزية')}</b>
            {done.checks.map((c) => <span key={c.text} style={{ display: 'flex', gap: 10, fontSize: 14, color: 'var(--ink2)' }}><b style={{ color: c.ok ? 'var(--ok)' : 'var(--acc)' }}>{c.ok ? '✓' : '!'}</b>{c.text}</span>)}
          </div>
        )}
        <Link href={`/status?ref=${done.ref}`} className="btn btn-p" style={{ marginTop: 6 }}>{t('تابع مشاركتك')}</Link>
      </div>
    );
  }

  const stepDot = (n: string, on: boolean) => <span className="num" style={{ width: 28, height: 28, borderRadius: '50%', background: on ? 'var(--acc)' : 'var(--s3)', color: on ? 'var(--onAcc)' : 'var(--ink)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>{n}</span>;
  const attached = mode === 'link' ? !!detected : !!path;
  const tagF = (k: string) => (filled.includes(k) ? <span className="chip c-acc" style={{ height: 20, fontSize: 11, padding: '0 7px' }}>{t('✦ من الفيلم')}</span> : null);
  const lbl = (k: string, tx: string) => <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{tx}<b style={{ color: 'var(--no)' }}>*</b>{tagF(k)}</span>;
  const Er = ({ k }: { k: string }) => (fe[k] ? <span className="err" role="alert">{t(fe[k])}</span> : null);
  const fx = (k: string): { className: string; style?: React.CSSProperties; 'aria-invalid'?: boolean } => ({ className: `fld${filled.includes(k) ? ' filled' : ''}`, ...(fe[k] ? { style: { borderColor: 'var(--no)' }, 'aria-invalid': true } : {}) });

  return (
    <>
      <div className="card" data-f="media" style={{ padding: 26, borderRadius: 22, display: 'flex', flexDirection: 'column', gap: 16, ...(fe.media ? { borderColor: 'var(--no)' } : {}) }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>{stepDot(t.n(1), true)}<b style={{ fontSize: 18 }}>{t('أرفق فيلمك')}</b></span>
          <div className="seg" role="group" aria-label={t('طريقة الإرفاق')}>
            <button type="button" className={mode === 'file' ? 'on' : ''} aria-pressed={mode === 'file'} onClick={() => setMode('file')}>{t('✦ رفع الفيلم')}</button>
            <button type="button" className={mode === 'link' ? 'on' : ''} aria-pressed={mode === 'link'} onClick={() => setMode('link')}>{t('رابط مشاهدة')}</button>
          </div>
        </div>
        {mode === 'link' ? (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input className="fld" dir="ltr" value={link} onChange={(e) => { setLink(e.target.value); setDetected(null); }} onBlur={readLink} placeholder={t('الصق رابط المشاهدة (Vimeo أو YouTube أو Drive)')} aria-label={t('رابط المشاهدة')} style={{ flex: '1 1 300px', height: 52 }} />
            <button type="button" className="btn btn-q" onClick={readLink} style={{ height: 52 }}><Icon name="spark" size={15} />{t('افحص الرابط')}</button>
          </div>
        ) : (
          <VideoIntake folder={festivalId} festivalId={festivalId} ctx={() => ({ title: f.title, synopsis: f.synopsis, genre: f.genre, category_id: cat || suggested })}
            onUploaded={setPath} onReport={onVideo} onDuration={onDuration}
            onUseSynopsis={(tx) => { setF((p) => ({ ...p, synopsis: tx })); document.getElementById('synopsis')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }} />
        )}
        <Er k="media" />
        {reading && mode === 'link' && <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--muted)' }}><Spinner size={16} />{t('نفحص الرابط…')}</span>}
        {detected && mode === 'link' && (
          <div className="rise" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', padding: '12px 14px', borderRadius: 14, background: 'var(--accT)' }}>
            <span style={{ color: 'var(--acc)', display: 'inline-flex' }}><Icon name="spark" size={15} /></span>
            {detected.source && <span className="chip c-mute">{detected.source}</span>}
            {detected.ok === true && <span className="chip c-ok">{t('الرابط يعمل ✓')}</span>}
            {detected.ok === false && <span className="chip c-no">{t('الرابط لا يفتح — تأكد أنه عام أو بكلمة مرور')}</span>}
            {detected.ok === null && <span className="chip c-mute">{t('سنفحص الرابط بعد الإرسال')}</span>}
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 26, borderRadius: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>{stepDot(t.n(2), attached)}<b style={{ fontSize: 18 }}>{t('عن الفيلم')}</b></span>
        {filled.length > 0 && (
          <div className="rise" style={{ padding: '12px 14px', borderRadius: 14, background: 'var(--accT)', border: '1px solid var(--accL)', display: 'flex', gap: 10, alignItems: 'center', fontSize: 14 }}>
            <span style={{ color: 'var(--acc)', display: 'inline-flex' }}><Icon name="spark" size={16} /></span>
            <span>{t('عبّأ NAS Vision')}{' '}{t.n(filled.length)} {filled.length > 2 ? t('حقول') : t('حقلًا')} {t('من الفيلم. راجعها وعدّل ما تريد، وأكمل اسم المخرج والبريد.')}</span>
          </div>
        )}
        <div className="g2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
          <label className="lbl" data-f="title">{lbl('title', t('عنوان الفيلم'))}<input {...fx('title')} value={f.title} onChange={set('title')} placeholder={t('اكتب العنوان')} maxLength={120} /><Er k="title" /></label>
          <label className="lbl" data-f="director">{lbl('director', t('اسم المخرج'))}<input {...fx('director')} value={f.director} onChange={set('director')} placeholder={t('الاسم الكامل')} autoComplete="name" maxLength={120} /><Er k="director" /></label>
          <label className="lbl" data-f="email">{lbl('email', t('البريد الإلكتروني'))}<input {...fx('email')} dir="ltr" type="email" inputMode="email" autoComplete="email" value={f.email} onChange={set('email')} placeholder="name@example.com" /><Er k="email" /><span className="hint">{t('نرسل عليه رقمك المرجعي والقرار.')}</span></label>
          <label className="lbl" data-f="duration">{lbl('duration', t('المدة بالدقائق'))}<input {...fx('duration')} inputMode="numeric" value={f.duration} onChange={(e) => { const v = e.target.value.replace(/[^\d٠-٩]/g, '').slice(0, 3); setF((p) => ({ ...p, duration: v })); setSuggested(suggestCategory(categories, f.genre, Number(v.replace(/[٠-٩]/g, (x) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(x)))) || null)); }} placeholder={t('مثلًا ٨٥')} style={{ ...(fx('duration').style || {}), fontFamily: 'var(--font-sans)' }} /><Er k="duration" /></label>
          <label className="lbl" data-f="genre">{lbl('genre', t('النوع'))}<select {...fx('genre')} value={f.genre} onChange={set('genre')}><option value="">{t('اختر')}</option>{GENRES.map((g) => <option key={g} value={g}>{t(g)}</option>)}</select><Er k="genre" /></label>
          <label className="lbl"><span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{t('لغة الفيلم')}{tagF('language')}</span><select {...fx('language')} value={f.language} onChange={set('language')}>{LANGS.map((g) => <option key={g} value={g}>{t(g)}</option>)}</select></label>
        </div>
        <label className="lbl" data-f="synopsis">
          <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>{lbl('synopsis', t('الملخص'))}
            <button type="button" onClick={improve} disabled={improving || !f.synopsis.trim()} className="btn btn-q btn-sm" style={{ height: 30, fontSize: 13 }}>
              {improving ? <Spinner size={13} /> : <span style={{ color: 'var(--acc)', display: 'inline-flex' }}><Icon name="spark" size={13} /></span>}{improved ? t('تمت الصياغة ✓') : t('حسّن الصياغة')}
            </button>
          </span>
          <textarea id="synopsis" {...fx('synopsis')} value={f.synopsis} onChange={set('synopsis')} maxLength={2000} placeholder={t('اكتب قصة فيلمك في سطرين إلى خمسة أسطر.')} />
          <span style={{ display: 'flex', justifyContent: 'space-between' }}><Er k="synopsis" /><span className="hint num" style={{ marginInlineStart: 'auto' }}>{t.n(f.synopsis.length)}{t('/٢٠٠٠')}</span></span>
        </label>
        <div className="lbl" data-f="category">{lbl('category', t('القسم'))}
          <div className="g2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
            {categories.map((c) => {
              const on = (cat || suggested) === c.id;
              return (
                <button key={c.id} type="button" aria-pressed={on} onClick={() => setCat(c.id)} className={`choice ${on ? 'on' : ''}`} style={fe.category ? { borderColor: 'var(--no)' } : undefined}>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}><b style={{ fontSize: 14.5 }}>{c.name}</b><span style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 400 }}>{c.description}{c.fee ? ` · ${c.fee}` : ''}</span></span>
                  {suggested === c.id && !cat && <span className="chip c-acc">{t('✦ مقترح')}</span>}
                </button>
              );
            })}
          </div>
          <Er k="category" />
        </div>
      </div>

      {rules.length > 0 && (
        <details className="card" style={{ padding: '16px 22px', borderRadius: 18 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{t('شروط المهرجان')}</summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>{rules.map((r) => <span key={r} style={{ display: 'flex', gap: 10, fontSize: 14, color: 'var(--ink2)' }}><b style={{ color: 'var(--acc)' }}>✓</b>{r}</span>)}</div>
        </details>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }} data-f="agree">
        <button type="button" onClick={() => setAgree(!agree)} aria-pressed={agree} style={{ background: 'none', border: 0, padding: 0, color: 'var(--ink2)', display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer', fontSize: 14.5, justifyContent: 'center' }}>
          <span style={{ width: 20, height: 20, borderRadius: 6, flex: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--onAcc)', ...(agree ? { background: 'var(--acc)' } : { border: `1.5px solid ${fe.agree ? 'var(--no)' : 'var(--line2)'}` }) }}>{agree && <Icon name="check" size={12} stroke={3.4} />}</span>
          {t('قرأت شروط المهرجان وأوافق عليها.')}</button>
        {err && <span className="err" style={{ textAlign: 'center' }} role="alert">{t(err)}</span>}
        <button type="button" className="btn btn-p btn-lg" onClick={send} disabled={sending} style={{ width: '100%', maxWidth: 420, height: 56 }}>
          {sending ? <><Spinner size={16} /> {t('نرسل ونحلّل فيلمك…')}</> : mode === 'file' && !path && video ? <><Spinner size={16} />{t('ننتظر اكتمال الرفع…')}</> : t('أرسل المشاركة')}
        </button>
      </div>
    </>
  );
}
