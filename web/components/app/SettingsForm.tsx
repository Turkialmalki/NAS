'use client';

import { useT } from '@/components/Lang';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Festival } from '@/lib/ctx';
import { Icon } from '../Icon';
import { PageHead } from './ui';
import { updateFestival, setPublished, saveCategory, deleteCategory, saveCriteria, duplicate } from '@/app/app/settings/actions';

type Cat = { id: string; name: string; description: string | null; fee: string | null };
type Crit = { id?: string; name: string; weight: number };

export function SettingsForm({ festival: f, categories, criteria, site }: { festival: Festival; categories: Cat[]; criteria: Crit[]; site: string }) {
  const t = useT();
  const router = useRouter();
  const [tab, setTab] = useState(0);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState('');
  const [crit, setCrit] = useState<Crit[]>(criteria);
  const [origin, setOrigin] = useState(site);
  useEffect(() => { if (!origin) setOrigin(window.location.origin); }, [origin]);
  const flash = (r: { ok: boolean; error?: string }, okMsg = 'تم الحفظ') => { setMsg(r.ok ? okMsg : r.error || t('تعذّر الحفظ')); router.refresh(); setTimeout(() => setMsg(''), 2800); };
  const link = `${origin}/f/${f.slug}`;
  const open = f.status === 'open';
  const wsum = crit.reduce((a, c) => a + (c.weight || 0), 0);

  return (
    <>
      <PageHead title={t('الإعدادات')} sub={f.name} right={<button type="button" className="btn btn-s btn-sm" disabled={pending} onClick={() => confirm(t('ننشئ دورة جديدة بنفس الأقسام والمعايير والفريق؟')) && start(async () => flash(await duplicate(), t('أُنشئت الدورة الجديدة')))}><Icon name="copy" size={15} />{t('انسخ الإعدادات لدورة جديدة')}</button>} />
      <div className="seg" role="group" aria-label={t('الأقسام')} style={{ alignSelf: 'flex-start' }}>
        {['عام', 'الأقسام', 'معايير التقييم', 'الفريق'].map((l, i) => <button key={l} type="button" className={tab === i ? 'on' : ''} aria-pressed={tab === i} onClick={() => setTab(i)}>{t(l)}</button>)}
      </div>

      {tab === 0 && (
        <>
          <div className="card" style={{ padding: '18px 24px', maxWidth: 820, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><b>{open ? t('صفحة التقديم منشورة') : t('صفحة التقديم غير منشورة')}</b><span className="num" style={{ fontSize: 13, color: 'var(--muted)', direction: 'ltr', textAlign: 'end' }}>{link}</span></span>
            <span style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn-q btn-sm" onClick={() => { navigator.clipboard?.writeText(link); setMsg(t('نُسخ الرابط')); setTimeout(() => setMsg(''), 2000); }}><Icon name="link" size={14} />{t('انسخ الرابط')}</button>
              <button type="button" className={`btn btn-sm ${open ? 'btn-s' : 'btn-p'}`} disabled={pending} onClick={() => start(async () => flash(await setPublished(!open), open ? t('أُغلق التقديم') : t('نُشرت صفحة التقديم')))}>{open ? t('أغلق التقديم') : t('انشر وافتح التقديم')}</button>
            </span>
          </div>
          <form className="card" style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 820 }} action={(fd) => start(async () => flash(await updateFestival(fd)))}>
            <div className="g2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
              <label className="lbl">{t('اسم المهرجان')}<input name="name" className="fld" defaultValue={f.name} required /></label>
              <label className="lbl">{t('رابط الصفحة')}<input name="slug" className="fld" dir="ltr" defaultValue={f.slug} pattern="[a-z0-9-]{3,60}" required /></label>
              <label className="lbl">{t('المدينة')}<input name="city" className="fld" defaultValue={f.city || ''} /></label>
            </div>
            <label className="lbl">{t('نبذة قصيرة')}<textarea name="description" className="fld" defaultValue={f.description || ''} style={{ height: 80 }} /></label>
            <div className="g4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 }}>
              <label className="lbl">{t('فتح التقديم')}<input name="open" type="date" className="fld" defaultValue={f.submissions_open || ''} /></label>
              <label className="lbl">{t('آخر موعد')}<input name="close" type="date" className="fld" defaultValue={f.submissions_close || ''} /></label>
              <label className="lbl">{t('نهاية التحكيم')}<input name="review" type="date" className="fld" defaultValue={f.review_deadline || ''} /></label>
              <label className="lbl">{t('إعلان النتائج')}<input name="results" type="date" className="fld" defaultValue={f.results_on || ''} /></label>
            </div>
            <label className="lbl">{t('الشروط')}{' '}<span className="hint">{t('شرط في كل سطر')}</span><textarea name="rules" className="fld" defaultValue={(f.rules || []).join('\n')} style={{ height: 110 }} /></label>
            <button className="btn btn-p" style={{ alignSelf: 'flex-start' }} disabled={pending}>{t('احفظ')}</button>
          </form>
        </>
      )}

      {tab === 1 && (
        <div className="card" style={{ padding: '10px 24px 20px', maxWidth: 820 }}>
          {categories.map((c) => (
            <form key={c.id} className="row" style={{ gap: 10, flexWrap: 'wrap' }} action={(fd) => start(async () => flash(await saveCategory(fd)))}>
              <input type="hidden" name="id" value={c.id} />
              <input name="name" className="fld" defaultValue={c.name} style={{ flex: '1 1 160px', height: 42 }} aria-label={t('اسم القسم')} />
              <input name="description" className="fld" defaultValue={c.description || ''} style={{ flex: '2 1 200px', height: 42 }} aria-label={t('الوصف')} placeholder={t('مثلًا: أقل من 40 دقيقة')} />
              <input name="fee" className="fld" defaultValue={c.fee || ''} style={{ flex: '0 1 110px', height: 42 }} aria-label={t('الرسوم')} placeholder={t('الرسوم')} />
              <button className="btn btn-q btn-sm" disabled={pending}>{t('احفظ')}</button>
              <button type="button" className="ibtn" aria-label={t('حذف')} onClick={() => confirm(t('حذف قسم «{name}»؟', { name: c.name })) && start(async () => flash(await deleteCategory(c.id), t('حُذف القسم')))}><Icon name="trash" size={15} /></button>
            </form>
          ))}
          <form style={{ paddingTop: 14, display: 'flex', gap: 10 }} action={(fd) => start(async () => flash(await saveCategory(fd), t('أُضيف القسم')))}>
            <input name="name" className="fld" placeholder={t('اسم قسم جديد')} style={{ height: 42, flex: 1 }} required />
            <input name="description" className="fld" placeholder={t('الوصف')} style={{ height: 42, flex: 1 }} />
            <button className="btn btn-q btn-sm"><Icon name="plus" size={15} />{t('أضف')}</button>
          </form>
          <p className="hint" style={{ marginTop: 12 }}>{t('اكتب المدة في الوصف (مثل «أقل من 40 دقيقة») ليستخدمها NAS في فحص الجاهزية واقتراح القسم.')}</p>
        </div>
      )}

      {tab === 2 && (
        <div className="card" style={{ padding: 24, maxWidth: 820, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span style={{ fontSize: 14, color: 'var(--muted)' }}>{t('المعايير التي يقيّم عليها المحكّمون (من 1 إلى 5)، ووزن كل معيار في التقييم النهائي.')}</span>
          {crit.map((c, i) => (
            <div key={c.id || i} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 140px 50px 36px', alignItems: 'center', gap: 12 }}>
              <input className="fld" value={c.name} onChange={(e) => setCrit(crit.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} style={{ height: 42 }} aria-label={t('المعيار')} />
              <input type="range" min={5} max={60} step={5} value={c.weight} onChange={(e) => setCrit(crit.map((x, j) => (j === i ? { ...x, weight: +e.target.value } : x)))} aria-label={t('الوزن')} style={{ accentColor: 'var(--acc)' }} />
              <b className="num" style={{ textAlign: 'end' }}>{t.n(wsum ? Math.round((c.weight / wsum) * 100) : 0)}{t('%')}</b>
              <button type="button" className="ibtn" aria-label={t('حذف')} onClick={() => setCrit(crit.filter((_, j) => j !== i))}><Icon name="x" size={14} /></button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn btn-q btn-sm" onClick={() => setCrit([...crit, { name: t('معيار جديد'), weight: 20 }])}><Icon name="plus" size={15} />{t('أضف معيارًا')}</button>
            <button type="button" className="btn btn-p btn-sm" disabled={pending || !crit.length} onClick={() => start(async () => flash(await saveCriteria(crit.filter((c) => c.name.trim()))))}>{t('احفظ المعايير')}</button>
          </div>
        </div>
      )}

      {tab === 3 && (
        <div className="card" style={{ padding: 24, maxWidth: 820, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ color: 'var(--muted)' }}>{t('تدير الفريق ولجنة التحكيم ودعواتهم من صفحة لجنة التحكيم.')}</span>
          <Link href="/app/jury" className="btn btn-q btn-sm">{t('لجنة التحكيم')}</Link>
        </div>
      )}
      {msg && <div className="toast">{t(msg)}</div>}
    </>
  );
}
