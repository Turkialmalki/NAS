'use client';
import { useTransition } from 'react';
import { setAccountType } from '@/app/app/me/actions';
import { useT } from '../Lang';
import { Icon, Spinner } from '../Icon';

export function Welcome({ name }: { name: string; title: string }) {
  const t = useT();
  const [pending, start] = useTransition();
  const pick = (k: 'filmmaker' | 'festival') => start(() => setAccountType(k));
  const card = (k: 'filmmaker' | 'festival', icon: string, title: string, body: string, points: string[]) => (
    <button type="button" className="role-card" disabled={pending} onClick={() => pick(k)}>
      <span className="drop-ic" style={{ width: 56, height: 56, borderRadius: 18 }}><Icon name={icon} size={24} /></span>
      <b style={{ fontSize: 22 }} className="display">{t(title)}</b>
      <span style={{ color: 'var(--muted)', fontSize: 15, lineHeight: 1.8 }}>{t(body)}</span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
        {points.map((p) => <span key={p} style={{ display: 'flex', gap: 10, fontSize: 14, color: 'var(--ink2)' }}><b style={{ color: 'var(--acc)' }}>✓</b>{t(p)}</span>)}
      </span>
      <span className="btn btn-p" style={{ marginTop: 'auto', alignSelf: 'stretch' }}>{pending ? <Spinner size={16} /> : <>{t('ابدأ')}<Icon name="arrow" size={16} stroke={2.2} className="fwd" /></>}</span>
    </button>
  );
  return (
    <div className="rise" style={{ maxWidth: 920, margin: '24px auto 0', width: '100%', display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h1 style={{ fontSize: 40 }}>{t('أهلًا {name}، كيف ستستخدم NAS؟', { name: name.split(' ')[0] })}</h1>
        <span style={{ color: 'var(--muted)', fontSize: 16.5 }}>{t('اختر ما يناسبك، ونجهّز لك مساحتك. تقدر تضيف الأخرى لاحقًا.')}</span>
      </div>
      <div className="g2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        {card('filmmaker', 'film', 'أنا صانع أفلام', 'ملف واحد لكل فيلم تقدّم به لأي مهرجان، وتتابع نتائجك في مكان واحد.', ['ارفع فيلمك ويحلّله NAS Vision ويعبّئ بياناته', 'مهرجانات مقترحة تناسب أفلامك', 'تابع كل مشاركاتك وقراراتها'])}
        {card('festival', 'grid', 'أنا أنظّم مهرجانًا', 'استقبل الأفلام وحلّلها وأدِر لجنة التحكيم والبرنامج من مكان واحد.', ['أنشئ مهرجانك من ملف في دقيقة', 'تحليل ذكي لكل فيلم يصلك', 'لجنة التحكيم والقرارات وجدول العروض'])}
      </div>
    </div>
  );
}
