'use client';
import { useState, useTransition } from 'react';
import { createFestival } from '@/app/app/new/actions';
import { ar } from '@/lib/fmt';

const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 50);

export function NewFestivalForm({ first, suggestedName, copyFrom }: { first: boolean; suggestedName: string; copyFrom: { id: string; name: string; edition: number }[] }) {
  const [tab, setTab] = useState(0);
  const [name, setName] = useState(suggestedName);
  const [slug, setSlug] = useState(slugify(suggestedName));
  const [touched, setTouched] = useState(false);
  const [err, setErr] = useState('');
  const [pending, start] = useTransition();
  const tabs = ['عام', 'المواعيد', 'الوصول'];
  return (
    <form action={(fd) => start(async () => { const r = await createFestival(fd); if (r && !r.ok) setErr(r.error || 'تعذّر الإنشاء'); })}
      style={{ maxWidth: 640, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h1 style={{ fontSize: 32 }}>{first ? 'أنشئ مهرجانك الأول' : 'مهرجان جديد'}</h1>
        <span style={{ color: 'var(--muted)' }}>دقيقة واحدة، وتقدر تعدّل كل شيء لاحقًا.</span>
      </div>
      <div className="seg" role="group" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {tabs.map((l, i) => <button key={l} type="button" className={tab === i ? 'on' : ''} onClick={() => setTab(i)}>{ar(i + 1)}. {l}</button>)}
      </div>
      <div className="card" style={{ padding: 26, borderRadius: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: tab === 0 ? 'flex' : 'none', flexDirection: 'column', gap: 14 }}>
          <label className="lbl">اسم المهرجان<input name="name" className="fld" value={name} onChange={(e) => { setName(e.target.value); if (!touched) setSlug(slugify(e.target.value)); }} placeholder="مثلًا: مهرجان الأفلام القصيرة" required /></label>
          <label className="lbl">رابط صفحة التقديم <span className="hint">بالحروف الإنجليزية</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, direction: 'ltr' }}><span className="num" style={{ color: 'var(--faint)', fontSize: 14 }}>/f/</span><input name="slug" className="fld" dir="ltr" value={slug} onChange={(e) => { setTouched(true); setSlug(e.target.value.toLowerCase()); }} placeholder="short-films" pattern="[a-z0-9-]{3,60}" required /></span>
          </label>
          <div className="g2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label className="lbl">المدينة<input name="city" className="fld" placeholder="الرياض" /></label>
            <label className="lbl">الدولة<select name="country" className="fld"><option>السعودية</option><option>الإمارات</option><option>مصر</option><option>الأردن</option><option>أخرى</option></select></label>
          </div>
          <label className="lbl">نبذة قصيرة<textarea name="description" className="fld" placeholder="سطرين عن مهرجانك" style={{ height: 84 }} /></label>
        </div>
        <div className="g2" style={{ display: tab === 1 ? 'grid' : 'none', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label className="lbl">فتح التقديم<input name="open" type="date" className="fld" /></label>
          <label className="lbl">إغلاق التقديم<input name="close" type="date" className="fld" /></label>
          <label className="lbl">نهاية التحكيم<input name="review" type="date" className="fld" /></label>
          <label className="lbl">إعلان النتائج<input name="results" type="date" className="fld" /></label>
        </div>
        <div style={{ display: tab === 2 ? 'flex' : 'none', flexDirection: 'column', gap: 14 }}>
          <div className="g2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label className="lbl">الحالة<select name="status" className="fld"><option value="draft">مسودة</option><option value="open">مفتوح للتقديم</option></select></label>
            <label className="lbl">الظهور<select name="visibility" className="fld"><option value="public">عام</option><option value="private">خاص (بالرابط فقط)</option></select></label>
          </div>
          {copyFrom.length > 0 && <label className="lbl">انسخ الأقسام والمعايير من<select name="copy" className="fld"><option value="">بدون — ابدأ بالإعدادات المقترحة</option>{copyFrom.map((c) => <option key={c.id} value={c.id}>{c.name} · الدورة {ar(c.edition)}</option>)}</select></label>}
          <span className="hint">نضيف لك أربعة أقسام وأربعة معايير تقييم جاهزة، وتعدّلها من الإعدادات.</span>
        </div>
      </div>
      {err && <span className="err" style={{ textAlign: 'center' }}>{err}</span>}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between' }}>
        {tab > 0 ? <button type="button" className="btn btn-s" onClick={() => setTab(tab - 1)}>السابق</button> : <span />}
        {tab < 2 ? <button type="button" className="btn btn-p" onClick={() => setTab(tab + 1)} disabled={!name || slug.length < 3}>التالي</button>
          : <button className="btn btn-p" disabled={pending || !name}>{pending ? 'ننشئ…' : 'أنشئ المهرجان'}</button>}
      </div>
    </form>
  );
}
