'use client';

import { useT } from '@/components/Lang';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { Icon } from './Icon';

export function ContactButton({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} style={style} onClick={() => setOpen(true)}>{children}</button>
      {open && <ContactModal onClose={() => setOpen(false)} />}
    </>
  );
}

function ContactModal({ onClose }: { onClose: () => void }) {
  const t = useT();
  const [state, setState] = useState<'form' | 'sending' | 'sent'>('form');
  const [err, setErr] = useState('');
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setState('sending'); setErr('');
    const { error } = await supabaseBrowser().from('contact_requests').insert({ name: fd.get('name'), email: fd.get('email'), org: fd.get('org') });
    if (error) { setErr(t('تعذّر الإرسال، حاول مرة أخرى.')); setState('form'); } else setState('sent');
  }
  return (
    <div className="modal-bg" role="dialog" aria-modal="true" aria-label={t('ابدأ مع NAS')} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card rise" style={{ width: '100%', maxWidth: 460, padding: 30, display: 'flex', flexDirection: 'column', gap: 18, borderRadius: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 24 }}>{t('ابدأ مع NAS')}</h2>
          <button type="button" className="ibtn" onClick={onClose} aria-label={t('إغلاق')}><Icon name="x" /></button>
        </div>
        {state !== 'sent' ? (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label className="lbl">{t('الاسم')}<input name="name" className="fld" placeholder={t('اسمك الكامل')} required /></label>
            <label className="lbl">{t('البريد الإلكتروني')}<input name="email" className="fld" dir="ltr" type="email" placeholder="name@example.sa" required /></label>
            <label className="lbl">{t('المهرجان أو الجهة')}<input name="org" className="fld" placeholder={t('اسم مهرجانك')} /></label>
            {err && <span className="err">{t(err)}</span>}
            <button className="btn btn-p btn-lg" disabled={state === 'sending'} style={{ marginTop: 6 }}>{state === 'sending' ? t('جارٍ الإرسال…') : t('أرسل')}</button>
            <span style={{ fontSize: 13, color: 'var(--faint)', textAlign: 'center' }}>{t('نتواصل معك خلال يوم عمل. أو')}{' '}<a className="link" href="/login?mode=signup">{t('أنشئ حسابك الآن')}</a> {t('وابدأ مباشرة.')}</span>
          </form>
        ) : (
          <div style={{ padding: '26px 0', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
            <span style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--okT)', color: 'var(--ok)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={24} stroke={2.4} /></span>
            <b style={{ fontSize: 19 }}>{t('وصلنا طلبك')}</b><span style={{ color: 'var(--muted)' }}>{t('نتواصل معك قريبًا على بريدك.')}</span>
          </div>
        )}
      </div>
    </div>
  );
}
