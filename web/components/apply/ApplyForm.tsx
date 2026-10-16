'use client';
import { useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase/client';
import { Icon, Spinner } from '../Icon';
import { ar, date } from '@/lib/fmt';

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
  const [mode, setMode] = useState<'link' | 'file'>('link');
  const [link, setLink] = useState('');
  const [reading, setReading] = useState(false);
  const [detected, setDetected] = useState<{ ok: boolean | null; source?: string } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState('');
  const [path, setPath] = useState<string | null>(null);
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

  async function pickFile(fl: File | null) {
    if (!fl) return;
    setFile(fl); setPath(null); setProgress('نقرأ الملف…');
    // read duration from the video itself
    const url = URL.createObjectURL(fl);
    const v = document.createElement('video');
    v.preload = 'metadata'; v.src = url;
    v.onloadedmetadata = () => {
      const mins = Math.round(v.duration / 60);
      URL.revokeObjectURL(url);
      if (mins > 0) setF((p) => { const n = { ...p, duration: String(mins) }; setSuggested(suggestCategory(categories, n.genre, mins)); return n; });
    };
    setProgress('نرفع الفيلم…');
    const p = `${festivalId}/${crypto.randomUUID()}-${fl.name.replace(/[^\w.\-]+/g, '_')}`;
    const { error } = await supabaseBrowser().storage.from('screeners').upload(p, fl, { upsert: false, contentType: fl.type || 'video/mp4' });
    if (error) { setProgress(''); setErr('تعذّر رفع الملف. جرّب رابطًا بدلًا منه.'); setFile(null); return; }
    setPath(p); setProgress('');
    setDetected({ ok: true, source: 'ملف مرفوع' });
  }

  async function improve() {
    if (!f.synopsis.trim()) return;
    setImproving(true);
    const r = await fetch('/api/improve', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: f.synopsis }) }).then((x) => x.json()).catch(() => null);
    if (r?.text) { setF((p) => ({ ...p, synopsis: r.text })); setImproved(true); }
    setImproving(false);
  }

  async function send() {
    setErr('');
    if (!f.title.trim() || !f.director.trim() || !/^\S+@\S+\.\S+$/.test(f.email)) { setErr('أكمل عنوان الفيلم واسم المخرج والبريد الإلكتروني.'); return; }
    if (mode === 'link' && !link) { setErr('أضف رابط المشاهدة أو ارفع الملف.'); return; }
    if (mode === 'file' && !path) { setErr('انتظر حتى يكتمل رفع الملف.'); return; }
    if (!(cat || suggested)) { setErr('اختر القسم.'); return; }
    setSending(true);
    const r = await fetch('/api/submit', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ festival_id: festivalId, category_id: cat || suggested, title: f.title, director: f.director, email: f.email, duration: f.duration,
        genre: f.genre, language: f.language, synopsis: f.synopsis, screener_url: mode === 'link' ? link : null, screener_path: mode === 'file' ? path : null }),
    }).then((x) => x.json()).catch(() => ({ error: 'failed' }));
    setSending(false);
    if (r.error) { setErr(r.error === 'festival_closed' ? 'التقديم مغلق لهذا المهرجان.' : r.error === 'invalid_input' ? 'تحقق من البيانات المدخلة.' : 'تعذّر الإرسال، حاول مرة أخرى.'); return; }
    setDone({ ref: r.ref_code, checks: r.checks || [] });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (done) {
    return (
      <div className="rise" style={{ maxWidth: 600, margin: '20px auto 0', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center' }}>
        <span style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--okT)', color: 'var(--ok)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={30} stroke={2.4} /></span>
        <h2 style={{ fontSize: 34 }}>وصلت مشاركتك</h2>
        <p style={{ margin: 0, color: 'var(--muted)', fontSize: 16.5, lineHeight: 1.85 }}>هذا رقمك المرجعي، احتفظ به لتتابع مشاركتك.{resultsOn ? ` تُعلن النتائج في ${date(resultsOn)}.` : ''}</p>
        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, borderRadius: 18 }}>
          <b className="num" style={{ fontSize: 24, direction: 'ltr' }}>{done.ref}</b>
          <button type="button" className="btn btn-q btn-sm" onClick={() => { navigator.clipboard?.writeText(done.ref); setCopied(true); }}>{copied ? 'نُسخ ✓' : 'انسخ'}</button>
        </div>
        {done.checks.length > 0 && (
          <div className="card" style={{ width: '100%', padding: '20px 22px', borderRadius: 18, textAlign: 'start', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <b style={{ fontSize: 15 }}>فحص الجاهزية</b>
            {done.checks.map((c) => <span key={c.text} style={{ display: 'flex', gap: 10, fontSize: 14, color: 'var(--ink2)' }}><b style={{ color: c.ok ? 'var(--ok)' : 'var(--acc)' }}>{c.ok ? '✓' : '!'}</b>{c.text}</span>)}
          </div>
        )}
        <Link href={`/status?ref=${done.ref}`} className="btn btn-p" style={{ marginTop: 6 }}>تابع مشاركتك</Link>
      </div>
    );
  }

  const stepDot = (n: string, on: boolean) => <span className="num" style={{ width: 28, height: 28, borderRadius: '50%', background: on ? 'var(--acc)' : 'var(--s3)', color: on ? 'var(--onAcc)' : 'var(--ink)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>{n}</span>;
  const attached = mode === 'link' ? !!detected : !!path;

  return (
    <>
      <div className="card" style={{ padding: 26, borderRadius: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>{stepDot('١', true)}<b style={{ fontSize: 18 }}>أرفق فيلمك</b></span>
        <div className="seg" role="group" aria-label="طريقة الإرفاق" style={{ alignSelf: 'flex-start' }}>
          <button type="button" className={mode === 'link' ? 'on' : ''} aria-pressed={mode === 'link'} onClick={() => setMode('link')}>رابط</button>
          <button type="button" className={mode === 'file' ? 'on' : ''} aria-pressed={mode === 'file'} onClick={() => setMode('file')}>رفع ملف</button>
        </div>
        {mode === 'link' ? (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input className="fld" dir="ltr" value={link} onChange={(e) => { setLink(e.target.value); setDetected(null); }} onBlur={readLink} placeholder="الصق رابط المشاهدة (Vimeo أو YouTube أو Drive)" aria-label="رابط المشاهدة" style={{ flex: '1 1 300px', height: 52 }} />
            <button type="button" className="btn btn-q" onClick={readLink} style={{ height: 52 }}><Icon name="spark" size={15} />افحص الرابط</button>
          </div>
        ) : (
          <label style={{ height: 120, borderRadius: 16, border: '1.5px dashed var(--line2)', background: 'var(--bg2)', color: 'var(--muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="file" accept="video/*" style={{ display: 'none' }} onChange={(e) => pickFile(e.target.files?.[0] || null)} />
            <Icon name="up" size={22} /><b style={{ color: 'var(--ink)' }}>{file ? file.name : 'اختر ملف الفيلم'}</b><span style={{ fontSize: 13 }}>MP4 أو MOV</span>
          </label>
        )}
        {(reading || progress) && <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--muted)' }}><Spinner size={16} />{progress || 'نفحص الرابط…'}</span>}
        {detected && (
          <div className="rise" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', padding: '12px 14px', borderRadius: 14, background: 'var(--accT)' }}>
            <span style={{ color: 'var(--acc)', display: 'inline-flex' }}><Icon name="spark" size={15} /></span>
            {detected.source && <span className="chip c-mute">{detected.source}</span>}
            {f.duration && mode === 'file' && <span className="chip c-mute">المدة {ar(f.duration)} دقيقة</span>}
            {detected.ok === true && <span className="chip c-ok">الرابط يعمل ✓</span>}
            {detected.ok === false && <span className="chip c-no">الرابط لا يفتح — تأكد أنه عام أو بكلمة مرور</span>}
            {detected.ok === null && <span className="chip c-mute">سنفحص الرابط بعد الإرسال</span>}
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 26, borderRadius: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>{stepDot('٢', attached)}<b style={{ fontSize: 18 }}>عن الفيلم</b></span>
        <div className="g2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
          <label className="lbl">عنوان الفيلم<input className="fld" value={f.title} onChange={set('title')} placeholder="اكتب العنوان" /></label>
          <label className="lbl">اسم المخرج<input className="fld" value={f.director} onChange={set('director')} placeholder="الاسم الكامل" /></label>
          <label className="lbl">البريد الإلكتروني<input className="fld" dir="ltr" type="email" value={f.email} onChange={set('email')} placeholder="name@example.com" /></label>
          <label className="lbl">المدة بالدقائق<input className="fld num" inputMode="numeric" value={f.duration} onChange={set('duration')} placeholder="مثلًا ٨٥" /></label>
          <label className="lbl">النوع<select className="fld" value={f.genre} onChange={set('genre')}><option value="">اختر</option>{GENRES.map((g) => <option key={g}>{g}</option>)}</select></label>
          <label className="lbl">لغة الفيلم<select className="fld" value={f.language} onChange={set('language')}>{LANGS.map((g) => <option key={g}>{g}</option>)}</select></label>
        </div>
        <label className="lbl">
          <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>الملخص
            <button type="button" onClick={improve} disabled={improving || !f.synopsis.trim()} className="btn btn-q btn-sm" style={{ height: 30, fontSize: 13 }}>
              {improving ? <Spinner size={13} /> : <span style={{ color: 'var(--acc)', display: 'inline-flex' }}><Icon name="spark" size={13} /></span>}{improved ? 'تمت الصياغة ✓' : 'حسّن الصياغة'}
            </button>
          </span>
          <textarea className="fld" value={f.synopsis} onChange={set('synopsis')} maxLength={2000} placeholder="عمّ يحكي فيلمك؟ سطران إلى خمسة." />
        </label>
        <div className="lbl">القسم
          <div className="g2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
            {categories.map((c) => {
              const on = (cat || suggested) === c.id;
              return (
                <button key={c.id} type="button" aria-pressed={on} onClick={() => setCat(c.id)} className={`choice ${on ? 'on' : ''}`}>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}><b style={{ fontSize: 14.5 }}>{c.name}</b><span style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 400 }}>{c.description}{c.fee ? ` · ${c.fee}` : ''}</span></span>
                  {suggested === c.id && <span className="chip c-acc">✦ مقترح</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {rules.length > 0 && (
        <details className="card" style={{ padding: '16px 22px', borderRadius: 18 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600 }}>شروط المهرجان</summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>{rules.map((r) => <span key={r} style={{ display: 'flex', gap: 10, fontSize: 14, color: 'var(--ink2)' }}><b style={{ color: 'var(--acc)' }}>✓</b>{r}</span>)}</div>
        </details>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <button type="button" onClick={() => setAgree(!agree)} aria-pressed={agree} style={{ background: 'none', border: 0, padding: 0, color: 'var(--ink2)', display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer', fontSize: 14.5, justifyContent: 'center' }}>
          <span style={{ width: 20, height: 20, borderRadius: 6, flex: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--onAcc)', ...(agree ? { background: 'var(--acc)' } : { border: '1.5px solid var(--line2)' }) }}>{agree && <Icon name="check" size={12} stroke={3.4} />}</span>
          قرأت شروط المهرجان وأوافق عليها.
        </button>
        {err && <span className="err" style={{ textAlign: 'center' }}>{err}</span>}
        <button type="button" className="btn btn-p btn-lg" onClick={send} disabled={!agree || sending} style={!agree ? { opacity: 0.45 } : undefined}>
          {sending ? <><Spinner size={16} /> نرسل ونحلّل فيلمك…</> : 'أرسل المشاركة'}
        </button>
      </div>
    </>
  );
}
