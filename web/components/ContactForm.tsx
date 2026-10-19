'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { sendContact } from '@/app/contact/actions';
import { useT } from './Lang';
import { Icon, Spinner } from './Icon';

const TOPICS: [string, string, string][] = [
  ['demo', 'play', 'عرض توضيحي للمنصة'], ['pricing', 'key', 'الأسعار والخطط'], ['support', 'shield', 'الدعم الفني'], ['partnership', 'users', 'الشراكات'],
];

export function ContactForm({ topic: initial }: { topic?: string }) {
  const t = useT();
  const [topic, setTopic] = useState(TOPICS.some(([k]) => k === initial) ? initial! : 'demo');
  const [v, setV] = useState({ name: '', email: '', org: '', phone: '', message: '' });
  const [err, setErr] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  const up = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV((p) => ({ ...p, [k]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const x: Record<string, string> = {};
    if (v.name.trim().length < 2) x.name = t('اكتب اسمك.');
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v.email.trim())) x.email = t('اكتب بريدًا إلكترونيًا صحيحًا.');
    if (v.phone.trim() && !/^[+\d\s-]{7,20}$/.test(v.phone.trim())) x.phone = t('رقم الجوال غير صحيح.');
    setErr(x); if (Object.keys(x).length) return;
    start(async () => {
      const r = await sendContact({ ...v, topic });
      if (r.ok) setDone(true); else setErr({ form: t('تعذّر الإرسال، حاول مرة أخرى.') });
    });
  }

  if (done) return (
    <div className="ct-done rise">
      <span className="ct-ok"><Icon name="check" size={28} stroke={2.4} /></span>
      <h1 className="display">{t('وصلتنا رسالتك')}</h1>
      <p>{t('شكرًا لك. يردّ عليك فريق NAS على بريدك خلال يوم عمل.')}</p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link href="/" className="btn btn-s">{t('الرئيسية')}</Link>
        <Link href="/login?mode=signup" className="btn btn-p">{t('ابدأ مجانًا')}</Link>
      </div>
    </div>
  );

  return (
    <div className="ct-grid">
      <div className="ct-side">
        <h1 className="display">{t('تحدّث مع فريق NAS')}</h1>
        <p>{t('أخبرنا عن مهرجانك، ونساعدك في اختيار الخطة المناسبة وتجهيز دورتك القادمة.')}</p>
        <ol className="ct-steps">
          {[['نراجع رسالتك', 'ونردّ عليك على بريدك خلال يوم عمل.'], ['عرض مباشر للمنصة', 'جلسة قصيرة نعرض فيها NAS على احتياج مهرجانك.'], ['نجهّز مهرجانك معك', 'ننقل بياناتك ونجهّز الأقسام ولجنة التحكيم وصفحة التقديم.']].map(([h, p], i) => (
            <li key={h}><span className="num">{i + 1}</span><span><b>{t(h)}</b><span>{t(p)}</span></span></li>
          ))}
        </ol>
        <div className="ct-alt">
          <span>{t('تفضّل البدء بنفسك؟')}</span>
          <Link href="/login?mode=signup" className="link">{t('أنشئ حسابًا مجانيًا')}</Link>
          <span className="sep" />
          <Link href="/pricing" className="link">{t('اطّلع على الأسعار')}</Link>
        </div>
      </div>

      <form className="ct-form" onSubmit={submit} noValidate>
        <span className="lbl" style={{ marginBottom: 2 }}>{t('كيف نساعدك؟')}</span>
        <div className="ct-topics" role="radiogroup">
          {TOPICS.map(([k, ic, l]) => (
            <button key={k} type="button" role="radio" aria-checked={topic === k} className={topic === k ? 'on' : ''} onClick={() => setTopic(k)}><Icon name={ic} size={16} />{t(l)}</button>
          ))}
        </div>
        <div className="g2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          <label className="lbl">{t('الاسم')}<input className="fld" value={v.name} onChange={up('name')} autoComplete="name" style={err.name ? { borderColor: 'var(--no)' } : undefined} />{err.name && <span className="err">{err.name}</span>}</label>
          <label className="lbl">{t('البريد الإلكتروني')}<input className="fld" dir="ltr" type="email" value={v.email} onChange={up('email')} autoComplete="email" style={err.email ? { borderColor: 'var(--no)' } : undefined} />{err.email && <span className="err">{err.email}</span>}</label>
          <label className="lbl">{t('المهرجان أو الجهة')} <input className="fld" value={v.org} onChange={up('org')} autoComplete="organization" /></label>
          <label className="lbl"><span>{t('رقم الجوال')} <span className="hint">{t('اختياري')}</span></span><input className="fld num" dir="ltr" type="tel" value={v.phone} onChange={up('phone')} placeholder="+966" autoComplete="tel" style={err.phone ? { borderColor: 'var(--no)' } : undefined} />{err.phone && <span className="err">{err.phone}</span>}</label>
        </div>
        <label className="lbl">{t('رسالتك')}<textarea className="fld" value={v.message} onChange={up('message')} maxLength={3000} placeholder={t('مثلًا: عدد الأفلام المتوقع، وموعد الدورة القادمة، وما تحتاجه من المنصة.')} style={{ height: 130, paddingTop: 12 }} /></label>
        {err.form && <span className="err" role="alert">{err.form}</span>}
        <button className="btn btn-p btn-lg" disabled={pending}>{pending ? <><Spinner size={16} />{t('جارٍ الإرسال…')}</> : t('أرسل الرسالة')}</button>
        <span className="hint" style={{ textAlign: 'center' }}>{t('نستخدم بياناتك للرد على رسالتك فقط.')}</span>
      </form>
    </div>
  );
}
