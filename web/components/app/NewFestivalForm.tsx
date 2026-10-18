'use client';

import { useT } from '@/components/Lang';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createFestivalFull, type NewFestival } from '@/app/app/new/actions';
import { readDocument } from '@/lib/docText';
import { slugFrom } from '@/lib/slug';
import type { FestivalDraft } from '@/lib/festivalExtract';
import { supabaseBrowser } from '@/lib/supabase/client';
import { Icon, Spinner } from '../Icon';

type Errors = Partial<Record<string, string>>;
const COUNTRIES = ['السعودية', 'الإمارات', 'مصر', 'الأردن', 'لبنان', 'قطر', 'الكويت', 'البحرين', 'عُمان', 'المغرب', 'تونس', 'العراق', 'أخرى'];
const STEPS = ['الأساسيات', 'المواعيد', 'الأقسام والشروط', 'المراجعة'];
const DEF_CATS = [
  { name: 'الروائي الطويل', description: 'أكثر من ٦٠ دقيقة', fee: 'مجانًا' }, { name: 'الوثائقي', description: 'بلا حد للمدة', fee: 'مجانًا' },
  { name: 'الأفلام القصيرة', description: 'أقل من ٤٠ دقيقة', fee: 'مجانًا' }, { name: 'الفيلم الأول', description: 'أول أو ثاني فيلم لمخرجه', fee: 'مجانًا' },
];
const DEF_CRIT = [{ name: 'القصة', weight: 30 }, { name: 'الإخراج', weight: 25 }, { name: 'الصورة والصوت', weight: 20 }, { name: 'الأصالة', weight: 25 }];
const DEF_RULES = ['اكتمل الفيلم خلال السنتين الماضيتين.', 'ترجمة عربية أو إنجليزية للأفلام بلغات أخرى.', 'رابط المشاهدة يبقى يعمل حتى إعلان النتائج.', 'لكل فيلم قسم واحد.'];
const READ_STAGES = ['نفتح الملف', 'نستخرج النص والصفحات', 'نفهم تفاصيل المهرجان بالذكاء الاصطناعي', 'نجهّز مهرجانك'];

const blank = (name: string, t: (s: string) => string = (s) => s): NewFestival => ({
  name, slug: name ? slugFrom(name) : '', city: '', country: 'السعودية', description: '', starts_on: '', ends_on: '', submissions_open: '', submissions_close: '', review_deadline: '', results_on: '',
  fee_note: t('مجانًا'), rules: DEF_RULES.map((r) => t(r)), categories: DEF_CATS.map((c) => ({ name: t(c.name), description: t(c.description), fee: t(c.fee) })), criteria: DEF_CRIT.map((c) => ({ ...c, name: t(c.name) })), status: 'open', visibility: 'public', source: 'manual',
});

/** Checks one step; returns field errors (empty object = valid). */
function check(step: number, d: NewFestival, slugTaken: boolean): Errors {
  const e: Errors = {};
  if (step === 0) {
    if (d.name.trim().length < 3) e.name = 'اكتب اسم المهرجان (٣ أحرف على الأقل).';
    else if (d.name.trim().length > 90) e.name = 'الاسم طويل، اختصره إلى ٩٠ حرفًا.';
    if (!/^[a-z0-9-]{3,60}$/.test(d.slug)) e.slug = 'حروف إنجليزية صغيرة وأرقام وشرطة فقط (٣ إلى ٦٠).';
    else if (slugTaken) e.slug = 'هذا الرابط مستخدم، جرّب غيره.';
    if (!d.country) e.country = 'اختر الدولة.';
    if (d.description.length > 600) e.description = 'النبذة طويلة (٦٠٠ حرف كحد أقصى).';
  }
  if (step === 1) {
    const lt = (a: string, b: string) => a && b && a > b;
    if (lt(d.submissions_open, d.submissions_close)) e.submissions_close = 'الإغلاق يجب أن يكون بعد فتح التقديم.';
    if (lt(d.submissions_close, d.review_deadline)) e.review_deadline = 'نهاية التحكيم تكون بعد إغلاق التقديم.';
    if (lt(d.review_deadline, d.results_on)) e.results_on = 'إعلان النتائج يكون بعد نهاية التحكيم.';
    else if (lt(d.submissions_close, d.results_on)) e.results_on = 'إعلان النتائج يكون بعد إغلاق التقديم.';
    if (lt(d.starts_on, d.ends_on)) e.ends_on = 'نهاية المهرجان بعد بدايته.';
    if (d.status === 'open' && d.submissions_close && d.submissions_close < new Date().toISOString().slice(0, 10)) e.submissions_close = 'تاريخ الإغلاق مضى. اختر تاريخًا قادمًا.';
  }
  if (step === 2) {
    const names = d.categories.map((c) => c.name.trim()).filter(Boolean);
    if (!names.length) e.categories = 'أضف قسمًا واحدًا على الأقل.';
    else if (new Set(names).size !== names.length) e.categories = 'أسماء الأقسام مكررة.';
    const crit = d.criteria.filter((c) => c.name.trim());
    if (!crit.length) e.criteria = 'أضف معيار تقييم واحدًا على الأقل.';
    else if (crit.reduce((s, c) => s + (Number(c.weight) || 0), 0) !== 100) e.criteria = 'مجموع الأوزان يجب أن يساوي ١٠٠٪.';
  }
  return e;
}

export function NewFestivalForm({ first, suggestedName }: { first: boolean; suggestedName: string }) {
  const t = useT();
  const router = useRouter();
  const [mode, setMode] = useState<'choose' | 'reading' | 'form'>('choose');
  const [step, setStep] = useState(0);
  const [seen, setSeen] = useState(0);
  const [d, setD] = useState<NewFestival>(() => blank(suggestedName, t));
  const [slugEdited, setSlugEdited] = useState(false);
  const [slugState, setSlugState] = useState<'idle' | 'checking' | 'ok' | 'taken'>('idle');
  const [errs, setErrs] = useState<Errors>({});
  const [showErr, setShowErr] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState('');
  const [file, setFile] = useState<{ name: string; stage: number; ai?: boolean; found: string[]; highlights: string[]; pages?: number } | null>(null);
  const [drag, setDrag] = useState(false);
  const slugTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const set = <K extends keyof NewFestival>(k: K, v: NewFestival[K]) => setD((p) => {
    const n = { ...p, [k]: v };
    if (k === 'name' && !slugEdited) n.slug = slugFrom(String(v));
    return n;
  });
  useEffect(() => { if (showErr) setErrs(check(step, d, slugState === 'taken')); }, [d, step, showErr, slugState]);

  // live check that the page link is free
  useEffect(() => {
    clearTimeout(slugTimer.current);
    if (!/^[a-z0-9-]{3,60}$/.test(d.slug)) { setSlugState('idle'); return; }
    setSlugState('checking');
    slugTimer.current = setTimeout(async () => {
      const { data } = await supabaseBrowser().rpc('slug_available', { p_slug: d.slug });
      setSlugState(data === false ? 'taken' : 'ok');
    }, 450);
  }, [d.slug]);

  const from = (k: string) => file?.found.includes(k);
  const tag = (k: string) => (from(k) ? <span className="chip c-acc" style={{ height: 20, fontSize: 11, padding: '0 7px' }}>{t('✦ من الملف')}</span> : null);

  function go(n: number) {
    if (n > step) {
      for (let s = step; s < n; s++) {
        const e = check(s, d, slugState === 'taken');
        if (Object.keys(e).length) { setStep(s); setErrs(e); setShowErr(true); return; }
      }
    }
    setShowErr(false); setErrs({}); setStep(n); setSeen((v) => Math.max(v, n));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function upload(fl: File | undefined | null) {
    if (!fl) return;
    if (fl.size > 40 * 1024 * 1024) { setFail('الملف كبير جدًا (الحد ٤٠ ميجابايت).'); return; }
    setFail(''); setMode('reading'); setFile({ name: fl.name, stage: 0, found: [], highlights: [] });
    try {
      const doc = await readDocument(fl);
      setFile((f) => f && { ...f, stage: 1, pages: doc.pages });
      if (!doc.text.trim() && !doc.file) throw new Error('empty');
      await new Promise((r) => setTimeout(r, 350));
      setFile((f) => f && { ...f, stage: 2 });
      const r = await fetch('/api/festival-from-file', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(doc) }).then((x) => x.json());
      const dr = r?.draft as (FestivalDraft & { ai: boolean }) | undefined;
      if (!dr) throw new Error('no_draft');
      setFile((f) => f && { ...f, stage: 3, ai: dr.ai, found: dr.found, highlights: dr.highlights || [] });
      const next: NewFestival = {
        ...blank('', t), source: 'file', name: dr.name || '', slug: dr.slug || slugFrom(dr.name || fl.name), city: dr.city || '',
        country: dr.country && COUNTRIES.includes(dr.country) ? dr.country : dr.country ? 'أخرى' : 'السعودية', description: dr.description || '',
        starts_on: dr.starts_on || '', ends_on: dr.ends_on || '', submissions_open: dr.submissions_open || '', submissions_close: dr.submissions_close || '',
        review_deadline: dr.review_deadline || '', results_on: dr.results_on || '', fee_note: dr.fee_note || 'مجانًا',
        rules: dr.rules.length ? dr.rules : DEF_RULES.map((r) => t(r)),
        categories: dr.categories.length ? dr.categories.map((c) => ({ name: c.name, description: c.description || '', fee: c.fee || '' })) : DEF_CATS.map((c) => ({ name: t(c.name), description: t(c.description), fee: t(c.fee) })),
        criteria: dr.criteria.length ? dr.criteria : DEF_CRIT.map((c) => ({ ...c, name: t(c.name) })),
        status: dr.submissions_close && dr.submissions_close < new Date().toISOString().slice(0, 10) ? 'draft' : 'open',
      };
      setSlugEdited(true);
      setD(next);
      await new Promise((r) => setTimeout(r, 500));
      setMode('form'); setStep(3); setSeen(3); setShowErr(true);
    } catch (e) {
      const m = String((e as Error).message);
      setMode('choose'); setFile(null);
      setFail(m === 'old_format' ? 'هذه صيغة قديمة. احفظ الملف بصيغة PPTX أو DOCX أو PDF ثم ارفعه.' : m === 'unsupported' ? 'ارفع ملف PDF أو PowerPoint أو Word أو صورة أو نص.' : m === 'too_big' ? 'الصورة كبيرة، جرّب صورة أصغر من ٢٫٥ ميجابايت.' : m === 'empty' ? 'لم نجد نصًا في الملف. إن كان PDF مصوّرًا فجرّب ملفًا أصغر من ٢٫٥ ميجابايت أو أدخل التفاصيل يدويًا.' : 'تعذّر قراءة الملف. جرّب ملفًا آخر أو أدخل التفاصيل يدويًا.');
    }
  }

  async function create() {
    for (let s = 0; s < 3; s++) { const e = check(s, d, slugState === 'taken'); if (Object.keys(e).length) { setStep(s); setErrs(e); setShowErr(true); setFail('أكمل الحقول المطلوبة أولًا.'); return; } }
    setBusy(true); setFail('');
    const r = await createFestivalFull({ ...d, categories: d.categories.filter((c) => c.name.trim()), criteria: d.criteria.filter((c) => c.name.trim()), rules: d.rules.map((x) => x.trim()).filter(Boolean) });
    if (!r.ok) { setBusy(false); setFail(r.error || 'تعذّر الإنشاء'); return; }
    router.push('/app?created=1'); router.refresh();
  }

  const sum = d.criteria.reduce((s, c) => s + (Number(c.weight) || 0), 0);
  const E = (k: string) => (showErr && errs[k] ? <span className="err" role="alert">{t(errs[k])}</span> : null);
  const bad = (k: string) => (showErr && errs[k] ? { borderColor: 'var(--no)' } : undefined);
  const missing = useMemo(() => [!d.submissions_close && 'موعد إغلاق التقديم', !d.city && 'المدينة', !d.description && 'نبذة عن المهرجان'].filter(Boolean) as string[], [d]);

  /* ---------------------------------------------------------------- choose */
  if (mode === 'choose') {
    return (
      <div className="rise" style={{ maxWidth: 820, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h1 style={{ fontSize: 34 }}>{first ? t('أنشئ مهرجانك الأول') : t('مهرجان جديد')}</h1>
          <span style={{ color: 'var(--muted)', fontSize: 16 }}>{t('ارفع ملف المهرجان ونجهّزه لك، أو أدخل التفاصيل بنفسك.')}</span>
        </div>
        <label className="drop" data-on={drag || undefined} style={{ minHeight: 260 }}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files?.[0]); }}>
          <input type="file" accept=".pdf,.pptx,.docx,.txt,.md,image/*" style={{ display: 'none' }} onChange={(e) => upload(e.target.files?.[0])} />
          <span className="drop-ic" style={{ width: 64, height: 64, borderRadius: 20 }}><Icon name="spark" size={28} /></span>
          <b style={{ fontSize: 21, color: 'var(--ink)' }}>{t('أنشئه من ملف')}</b>
          <span style={{ fontSize: 15, maxWidth: 440, lineHeight: 1.8 }}>{t('اسحب ملف المهرجان هنا (العرض التقديمي، الكتيّب، الشروط أو الملصق). يقرأه الذكاء الاصطناعي ويجهّز الاسم والمواعيد والأقسام والشروط ومعايير التحكيم.')}</span>
          <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 }}>{['PDF', 'PowerPoint', 'Word', 'صورة'].map((tx) => <span key={tx} className="chip c-mute">{t(tx)}</span>)}</span>
          <span className="btn btn-p" style={{ marginTop: 8 }}><Icon name="up" size={16} />{t('اختر الملف')}</span>
        </label>
        {fail && <span className="err" style={{ textAlign: 'center' }} role="alert">{fail}</span>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--faint)', fontSize: 13 }}><span style={{ flex: 1, height: 1, background: 'var(--line)' }} />{t('أو')}<span style={{ flex: 1, height: 1, background: 'var(--line)' }} /></div>
        <button type="button" className="alt-btn" style={{ height: 58, borderRadius: 16, fontSize: 16 }} onClick={() => { setMode('form'); setStep(0); setSeen(0); }}>
          <Icon name="list" size={18} />{t('أدخل التفاصيل بنفسك')}<span style={{ color: 'var(--faint)', fontWeight: 400, fontSize: 14 }}>{t('· ٣ خطوات قصيرة')}</span>
        </button>
      </div>
    );
  }

  /* ---------------------------------------------------------------- reading */
  if (mode === 'reading' && file) {
    return (
      <div className="rise" style={{ maxWidth: 560, width: '100%', margin: '40px auto 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26, textAlign: 'center' }}>
        <span className="drop-ic pulse" style={{ width: 76, height: 76, borderRadius: 24 }}><Icon name="spark" size={34} /></span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h1 style={{ fontSize: 28 }}>{t('نقرأ ملفك…')}</h1>
          <span className="num" style={{ color: 'var(--muted)', direction: 'ltr' }}>{file.name}{file.pages ? ` · ${file.pages} ${file.pages > 1 ? 'pages' : 'page'}` : ''}</span>
        </div>
        <div className="card" style={{ width: '100%', padding: 22, borderRadius: 20, display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'start' }}>
          {READ_STAGES.map((tx, i) => (
            <span key={tx} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 15, color: i <= file.stage ? 'var(--ink)' : 'var(--faint)' }}>
              <span style={{ width: 26, height: 26, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none', background: i < file.stage ? 'var(--okT)' : i === file.stage ? 'var(--accT)' : 'var(--s2)', color: i < file.stage ? 'var(--ok)' : 'var(--acc)' }}>
                {i < file.stage ? <Icon name="check" size={13} stroke={2.6} /> : i === file.stage ? <Spinner size={13} /> : <span style={{ fontSize: 12 }}>{t.n(i + 1)}</span>}
              </span>{t(tx)}
            </span>
          ))}
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- form */
  const dateFld = (k: 'submissions_open' | 'submissions_close' | 'review_deadline' | 'results_on' | 'starts_on' | 'ends_on', label: string, hint?: string) => (
    <label className="lbl"><span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{label}{tag(k)}</span>
      <input type="date" className="fld" value={d[k]} onChange={(e) => set(k, e.target.value)} style={bad(k)} aria-invalid={!!(showErr && errs[k])} />
      {E(k) || (hint && <span className="hint">{hint}</span>)}
    </label>
  );

  return (
    <div style={{ maxWidth: 760, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 28 }}>{d.source === 'file' ? t('راجع مهرجانك') : first ? t('أنشئ مهرجانك الأول') : t('مهرجان جديد')}</h1>
        <button type="button" className="btn btn-g btn-sm" onClick={() => { setMode('choose'); setFail(''); }}>{d.source === 'file' ? t('ارفع ملفًا آخر') : t('أنشئه من ملف بدلًا من ذلك')}</button>
      </div>

      {file && file.stage === 3 && (
        <div className="rise" style={{ padding: '16px 18px', borderRadius: 18, background: 'var(--accT)', border: '1px solid var(--accL)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{ display: 'flex', gap: 10, alignItems: 'center', fontWeight: 600 }}><span style={{ color: 'var(--acc)', display: 'inline-flex' }}><Icon name="spark" size={17} /></span>
            {t('جهّزنا المهرجان من «')}{file.name}{t('» · وجدنا')}{' '}{t.n(file.found.length)} {t('من ١١ تفصيلًا')}</span>
          {file.highlights.length > 0 && <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{file.highlights.map((h) => <span key={h} style={{ fontSize: 13.5, color: 'var(--ink2)' }}>• {h}</span>)}</span>}
          {missing.length > 0 && <span style={{ fontSize: 13.5, color: 'var(--ink2)' }}>{t('لم نجد في الملف:')}{' '}{missing.join(t('، '))}{t('. أضفها قبل النشر.')}</span>}
          {!file.ai && <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{t('قراءة أساسية. لنتائج أدق فعّل مفتاح الذكاء الاصطناعي في إعدادات المنصة.')}</span>}
        </div>
      )}

      <div className="steps" role="tablist" aria-label={t('خطوات الإنشاء')}>
        {STEPS.map((tx, i) => (
          <button key={tx} type="button" role="tab" aria-selected={step === i} disabled={i > seen + 1 && i > step} onClick={() => go(i)} data-s={i < step ? 'done' : i === step ? 'on' : 'off'}>
            <span className="n">{i < step ? <Icon name="check" size={12} stroke={2.6} /> : t.n(i + 1)}</span><span className="t">{t(tx)}</span>
          </button>
        ))}
      </div>

      <div className="card rise" key={step} style={{ padding: 26, borderRadius: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {step === 0 && <>
          <label className="lbl"><span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{t('اسم المهرجان')}{' '}<b style={{ color: 'var(--no)' }}>*</b>{tag('name')}</span>
            <input className="fld" autoFocus value={d.name} onChange={(e) => set('name', e.target.value)} placeholder={t('مثلًا: مهرجان جدة للأفلام القصيرة')} style={{ ...bad('name'), height: 54, fontSize: 17 }} aria-invalid={!!(showErr && errs.name)} />{E('name')}
          </label>
          <label className="lbl">{t('رابط صفحة التقديم')}<span style={{ display: 'flex', alignItems: 'center', direction: 'ltr', border: '1px solid var(--line2)', borderRadius: 12, background: 'var(--bg2)', overflow: 'hidden', ...bad('slug') }}>
              <span className="num" style={{ padding: '0 4px 0 14px', color: 'var(--faint)', fontSize: 14, whiteSpace: 'nowrap' }}>nasfestivals.com/f/</span>
              <input dir="ltr" value={d.slug} onChange={(e) => { setSlugEdited(true); set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); }} style={{ flex: 1, height: 48, border: 0, background: 'transparent', color: 'var(--ink)', font: 'inherit', fontSize: 15, outline: 'none', minWidth: 0 }} aria-label={t('رابط صفحة التقديم')} />
              <span style={{ padding: '0 14px', fontSize: 12.5, whiteSpace: 'nowrap', color: slugState === 'ok' ? 'var(--ok)' : slugState === 'taken' ? 'var(--no)' : 'var(--faint)' }}>{slugState === 'checking' ? '…' : slugState === 'ok' ? t('✓ متاح') : slugState === 'taken' ? t('مستخدم') : ''}</span>
            </span>
            {E('slug') || <span className="hint">{t('يُنشأ تلقائيًا من الاسم، ويمكنك تعديله.')}</span>}
          </label>
          <div className="g2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label className="lbl"><span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{t('المدينة')}{tag('city')}</span><input className="fld" value={d.city} onChange={(e) => set('city', e.target.value)} placeholder={t('الرياض')} /></label>
            <label className="lbl">{t('الدولة')}<select className="fld" value={d.country} onChange={(e) => set('country', e.target.value)} style={bad('country')}>{COUNTRIES.map((c) => <option key={c} value={c}>{t(c)}</option>)}</select>{E('country')}</label>
          </div>
          <label className="lbl"><span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{t('نبذة قصيرة')}{tag('description')}<span className="hint num" style={{ marginInlineStart: 'auto' }}>{t.n(d.description.length)}{t('/٦٠٠')}</span></span>
            <textarea className="fld" value={d.description} onChange={(e) => set('description', e.target.value)} placeholder={t('سطران عن مهرجانك يظهران في صفحة التقديم')} style={{ height: 96, ...bad('description') }} />{E('description')}
          </label>
        </>}

        {step === 1 && <>
          <span style={{ fontSize: 14, color: 'var(--muted)' }}>{t('كل المواعيد اختيارية، ونرتبها لك ونتأكد أنها منطقية.')}</span>
          <div className="g2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {dateFld('submissions_open', 'فتح التقديم', 'اتركه فارغًا ليبدأ فورًا')}
            {dateFld('submissions_close', 'إغلاق التقديم')}
            {dateFld('review_deadline', 'نهاية التحكيم')}
            {dateFld('results_on', 'إعلان النتائج')}
            {dateFld('starts_on', 'بداية المهرجان')}
            {dateFld('ends_on', 'نهاية المهرجان')}
          </div>
          <label className="lbl"><span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{t('رسوم التقديم')}{tag('fee_note')}</span><input className="fld" value={d.fee_note} onChange={(e) => set('fee_note', e.target.value)} placeholder={t('مجانًا')} /></label>
        </>}

        {step === 2 && <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><b style={{ fontSize: 16 }}>{t('الأقسام')}</b>{tag('categories')}<span className="hint">{t('يختار صانع الفيلم واحدًا منها')}</span></span>
            {d.categories.map((c, i) => (
              <div key={i} className="g2" style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.3fr .8fr 40px', gap: 8, alignItems: 'center' }}>
                <input className="fld" value={c.name} placeholder={t('اسم القسم')} onChange={(e) => set('categories', d.categories.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} style={{ height: 44 }} />
                <input className="fld" value={c.description} placeholder={t('الشرط، مثلًا: أقل من ٤٠ دقيقة')} onChange={(e) => set('categories', d.categories.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} style={{ height: 44 }} />
                <input className="fld" value={c.fee} placeholder={t('الرسوم')} onChange={(e) => set('categories', d.categories.map((x, j) => (j === i ? { ...x, fee: e.target.value } : x)))} style={{ height: 44 }} />
                <button type="button" className="ibtn" aria-label={t('حذف القسم')} onClick={() => set('categories', d.categories.filter((_, j) => j !== i))}><Icon name="trash" size={15} /></button>
              </div>
            ))}
            <button type="button" className="btn btn-g btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => set('categories', [...d.categories, { name: '', description: '', fee: 'مجانًا' }])}><Icon name="plus" size={14} />{t('أضف قسمًا')}</button>
            {E('categories')}
          </div>
          <div style={{ height: 1, background: 'var(--line)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><b style={{ fontSize: 16 }}>{t('معايير التحكيم')}</b>{tag('criteria')}
              <span className="num" style={{ marginInlineStart: 'auto', fontSize: 13, fontWeight: 600, color: sum === 100 ? 'var(--ok)' : 'var(--no)' }}>{t('المجموع')}{' '}{t.n(sum)}{t('٪')}</span></span>
            {d.criteria.map((c, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 110px 40px', gap: 8, alignItems: 'center' }}>
                <input className="fld" value={c.name} placeholder={t('المعيار')} onChange={(e) => set('criteria', d.criteria.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} style={{ height: 44 }} />
                <span style={{ position: 'relative' }}><input className="fld num" inputMode="numeric" value={c.weight || ''} onChange={(e) => set('criteria', d.criteria.map((x, j) => (j === i ? { ...x, weight: Math.min(100, Number(e.target.value.replace(/\D/g, '')) || 0) } : x)))} style={{ height: 44, paddingInlineEnd: 30 }} aria-label={t('الوزن')} /><span style={{ position: 'absolute', insetInlineEnd: 12, top: 12, color: 'var(--faint)' }}>{t('٪')}</span></span>
                <button type="button" className="ibtn" aria-label={t('حذف المعيار')} onClick={() => set('criteria', d.criteria.filter((_, j) => j !== i))}><Icon name="trash" size={15} /></button>
              </div>
            ))}
            <span style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn-g btn-sm" onClick={() => set('criteria', [...d.criteria, { name: '', weight: 0 }])}><Icon name="plus" size={14} />{t('أضف معيارًا')}</button>
              {sum !== 100 && d.criteria.length > 0 && <button type="button" className="btn btn-q btn-sm" onClick={() => { const n = d.criteria.length; set('criteria', d.criteria.map((c, i) => ({ ...c, weight: Math.floor(100 / n) + (i < 100 % n ? 1 : 0) }))); }}>{t('وزّع بالتساوي')}</button>}
            </span>
            {E('criteria')}
          </div>
          <div style={{ height: 1, background: 'var(--line)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}><b style={{ fontSize: 16 }}>{t('شروط المشاركة')}</b>{tag('rules')}</span>
            {d.rules.map((r, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 40px', gap: 8 }}>
                <input className="fld" value={r} onChange={(e) => set('rules', d.rules.map((x, j) => (j === i ? e.target.value : x)))} style={{ height: 44 }} />
                <button type="button" className="ibtn" aria-label={t('حذف الشرط')} onClick={() => set('rules', d.rules.filter((_, j) => j !== i))}><Icon name="trash" size={15} /></button>
              </div>
            ))}
            <button type="button" className="btn btn-g btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => set('rules', [...d.rules, ''])}><Icon name="plus" size={14} />{t('أضف شرطًا')}</button>
          </div>
        </>}

        {step === 3 && <>
          {([
            [0, 'الأساسيات', [['الاسم', d.name], ['الرابط', `/f/${d.slug}`], ['المكان', [d.city, d.country].filter(Boolean).join(t('، '))], ['النبذة', d.description || '—']]],
            [1, 'المواعيد', [['فتح التقديم', d.submissions_open ? t.date(d.submissions_open) : t('فورًا')], ['إغلاق التقديم', d.submissions_close ? t.date(d.submissions_close) : '—'], ['نهاية التحكيم', d.review_deadline ? t.date(d.review_deadline) : '—'], ['إعلان النتائج', d.results_on ? t.date(d.results_on) : '—'], ['أيام المهرجان', d.starts_on ? `${t.date(d.starts_on)}${d.ends_on ? ' — ' + t.date(d.ends_on) : ''}` : '—'], ['الرسوم', d.fee_note || '—']]],
            [2, 'الأقسام والتحكيم', [['الأقسام', d.categories.filter((c) => c.name).map((c) => c.name).join(t('، '))], ['المعايير', d.criteria.filter((c) => c.name).map((c) => `${c.name} ${t.n(c.weight)}%`).join(t('، '))], ['الشروط', `${t.n(d.rules.filter(Boolean).length)} شروط`]]],
          ] as [number, string, [string, string][]][]).map(([s, tx, rows]) => {
            const e = Object.keys(check(s, d, slugState === 'taken')).length > 0;
            return (
              <div key={tx} style={{ padding: 18, borderRadius: 16, background: 'var(--s2)', display: 'flex', flexDirection: 'column', gap: 10, border: e ? '1px solid var(--no)' : '1px solid transparent' }}>
                <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><b style={{ fontSize: 15.5 }}>{t(tx)}{e && <span style={{ color: 'var(--no)', fontSize: 13, fontWeight: 500 }}> {t('· يحتاج مراجعة')}</span>}</b><button type="button" className="btn btn-g btn-sm" style={{ height: 30 }} onClick={() => go(s)}>{t('تعديل')}</button></span>
                {rows.map(([k, v]) => <span key={k} style={{ display: 'grid', gridTemplateColumns: '110px minmax(0,1fr)', gap: 10, fontSize: 14, lineHeight: 1.7 }}><span style={{ color: 'var(--muted)' }}>{t(k)}</span><span style={{ color: 'var(--ink)' }}>{v}</span></span>)}
              </div>
            );
          })}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }} className="g2">
            {([['open', 'افتح التقديم الآن', 'تظهر صفحة التقديم وتستقبل الأفلام'], ['draft', 'احفظه كمسودة', 'تراجع الإعدادات وتنشر لاحقًا']] as const).map(([k, tx, s]) => (
              <button key={k} type="button" className={`choice ${d.status === k ? 'on' : ''}`} aria-pressed={d.status === k} onClick={() => set('status', k)}>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}><b style={{ fontSize: 14.5 }}>{t(tx)}</b><span style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 400 }}>{t(s)}</span></span>
              </button>
            ))}
          </div>
        </>}
      </div>

      {fail && <span className="err" style={{ textAlign: 'center' }} role="alert">{fail}</span>}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center' }}>
        {step > 0 ? <button type="button" className="btn btn-s" onClick={() => go(step - 1)}>{t('السابق')}</button> : <span />}
        {step < 3
          ? <button type="button" className="btn btn-p btn-lg" onClick={() => go(step + 1)}>{t('التالي')}<Icon name="arrow" size={16} stroke={2.2} className="fwd" /></button>
          : <button type="button" className="btn btn-p btn-lg" disabled={busy} onClick={create}>{busy ? <><Spinner size={16} />{t('ننشئ مهرجانك…')}</> : <><Icon name="check" size={16} stroke={2.4} />{t('أنشئ المهرجان')}</>}</button>}
      </div>
    </div>
  );
}
