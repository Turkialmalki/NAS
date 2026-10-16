'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { LogoMark } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { Icon, Spinner } from './Icon';

type Step = 'start' | 'code' | 'phone' | 'phoneCode';

export function LoginForm({ signup: initialSignup, next, linkError }: { signup: boolean; next: string; linkError: boolean }) {
  const router = useRouter();
  const [up, setUp] = useState(initialSignup);
  const [step, setStep] = useState<Step>('start');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+966');
  const [name, setName] = useState('');
  const [festival, setFestival] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(linkError ? 'انتهت صلاحية الرابط. اطلب رمزًا جديدًا.' : '');
  const sb = supabaseBrowser();
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const redirect = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
  const meta = up ? { full_name: name || undefined, festival: festival || undefined } : undefined;

  async function oauth(provider: 'google' | 'apple') {
    setErr('');
    const { error } = await sb.auth.signInWithOAuth({ provider, options: { redirectTo: redirect } });
    if (error) setErr(provider === 'google' ? 'الدخول عبر Google غير مفعّل بعد.' : 'الدخول عبر Apple غير مفعّل بعد.');
  }
  async function sendEmail(e?: React.FormEvent) {
    e?.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) { setErr('اكتب بريدًا إلكترونيًا صحيحًا.'); return; }
    setBusy(true); setErr('');
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect, shouldCreateUser: true, data: meta } });
    setBusy(false);
    if (error) { setErr(/rate/i.test(error.message) ? 'طلبات كثيرة، انتظر دقيقة ثم حاول.' : 'تعذّر الإرسال، حاول مرة أخرى.'); return; }
    setStep('code'); setCode('');
  }
  async function sendPhone(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true); setErr('');
    const { error } = await sb.auth.signInWithOtp({ phone: phone.replace(/\s/g, ''), options: { data: meta } });
    setBusy(false);
    if (error) { setErr('الدخول برقم الجوال غير مفعّل بعد. استخدم البريد الإلكتروني.'); return; }
    setStep('phoneCode'); setCode('');
  }
  async function verify(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true); setErr('');
    const res = step === 'phoneCode'
      ? await sb.auth.verifyOtp({ phone: phone.replace(/\s/g, ''), token: code, type: 'sms' })
      : await sb.auth.verifyOtp({ email, token: code, type: 'email' });
    setBusy(false);
    if (res.error) { setErr('الرمز غير صحيح أو انتهت صلاحيته.'); return; }
    router.replace(next); router.refresh();
  }

  const Social = ({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick: () => void }) => (
    <button type="button" onClick={onClick} className="btn btn-s" style={{ height: 50, width: '100%', justifyContent: 'center', gap: 10 }}>
      <span style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--s3)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{icon}</span>{label}
    </button>
  );
  const verb = up ? 'التسجيل' : 'المتابعة';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px' }}>
        <Link href="/" style={{ fontSize: 14, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ transform: 'scaleX(-1)', display: 'inline-flex' }}><Icon name="arrow" size={15} stroke={2} /></span>العودة للموقع</Link>
        <ThemeToggle />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '12px 24px 60px' }}>
        <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
          <LogoMark height={44} id="lgs" />
          {step === 'start' && (
            <div className="rise" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <h1 style={{ fontSize: 32 }}>{up ? 'أنشئ حسابك' : 'أهلًا بعودتك'}</h1>
                <span style={{ color: 'var(--muted)', fontSize: 15.5 }}>{up ? 'لمهرجانك أو للجنة التحكيم.' : 'سجّل الدخول لمتابعة عملك.'}</span>
              </div>
              <div className="seg" role="group" aria-label="نوع الحساب" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderRadius: 999 }}>
                <button type="button" className={!up ? 'on' : ''} style={{ borderRadius: 999 }} onClick={() => setUp(false)}>دخول</button>
                <button type="button" className={up ? 'on' : ''} style={{ borderRadius: 999 }} onClick={() => setUp(true)}>حساب جديد</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Social label={`${verb} عبر Google`} icon="G" onClick={() => oauth('google')} />
                <Social label={`${verb} عبر Apple`} icon="A" onClick={() => oauth('apple')} />
                <Social label={`${verb} برقم الجوال`} icon={<Icon name="phone" size={12} stroke={2} />} onClick={() => { setErr(''); setStep('phone'); }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--faint)', fontSize: 13 }}><span style={{ flex: 1, height: 1, background: 'var(--line)' }} />أو بالبريد الإلكتروني<span style={{ flex: 1, height: 1, background: 'var(--line)' }} /></div>
              <form onSubmit={sendEmail} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {up && (
                  <div className="g2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <input className="fld" value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم" aria-label="الاسم" style={{ height: 50, borderRadius: 14 }} />
                    <input className="fld" value={festival} onChange={(e) => setFestival(e.target.value)} placeholder="المهرجان (اختياري)" aria-label="المهرجان" style={{ height: 50, borderRadius: 14 }} />
                  </div>
                )}
                <label style={{ position: 'relative', display: 'block' }}>
                  <input className="fld" dir="ltr" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="البريد الإلكتروني" aria-label="البريد الإلكتروني" style={{ height: 52, borderRadius: 14, padding: '0 16px 0 58px', textAlign: 'right' }} />
                  <button aria-label="متابعة" disabled={busy} style={{ position: 'absolute', left: 7, top: 7, width: 38, height: 38, borderRadius: '50%', border: 0, background: 'var(--acc)', color: 'var(--onAcc)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    {busy ? <span className="spin" style={{ display: 'inline-flex' }}><Icon name="spin" size={16} stroke={2.4} /></span> : <Icon name="arrow" size={17} stroke={2.2} />}
                  </button>
                </label>
              </form>
              {err && <span className="err" style={{ textAlign: 'center' }}>{err}</span>}
              <span style={{ fontSize: 12.5, color: 'var(--faint)', textAlign: 'center', lineHeight: 1.7 }}>بدون كلمة مرور. بالمتابعة توافق على <Link href="/terms" style={{ textDecoration: 'underline' }}>الشروط</Link> و<Link href="/privacy" style={{ textDecoration: 'underline' }}>سياسة الخصوصية</Link>.</span>
            </div>
          )}
          {step === 'phone' && (
            <form onSubmit={sendPhone} className="rise" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 18, textAlign: 'center' }}>
              <h1 style={{ fontSize: 32 }}>رقم الجوال</h1>
              <input className="fld num" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+9665XXXXXXXX" aria-label="رقم الجوال" style={{ height: 54, borderRadius: 14, fontSize: 18, textAlign: 'center' }} />
              {err && <span className="err">{err}</span>}
              <button className="btn btn-p btn-lg" disabled={busy}>{busy ? 'نرسل…' : 'أرسل الرمز'}</button>
              <button type="button" className="btn btn-g btn-sm" onClick={() => { setStep('start'); setErr(''); }}>رجوع</button>
            </form>
          )}
          {(step === 'code' || step === 'phoneCode') && (
            <form onSubmit={verify} className="rise" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, textAlign: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <h1 style={{ fontSize: 32 }}>افتح {step === 'code' ? 'بريدك' : 'رسائلك'}</h1>
                <span style={{ color: 'var(--muted)', fontSize: 15.5, lineHeight: 1.8 }}>أرسلنا {step === 'code' ? 'رابط دخول ورمزًا' : 'رمزًا'} إلى<br /><b className="num" style={{ color: 'var(--ink)', direction: 'ltr', display: 'inline-block' }}>{step === 'code' ? email : phone}</b></span>
              </div>
              <input className="fld num" dir="ltr" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="••••••" aria-label="الرمز"
                style={{ height: 62, borderRadius: 16, fontSize: 28, letterSpacing: '.5em', textAlign: 'center', fontWeight: 600 }} />
              {err && <span className="err">{err}</span>}
              <button className="btn btn-p btn-lg" style={{ width: '100%' }} disabled={busy || code.length < 6}>{busy ? 'نتحقق…' : 'متابعة'}</button>
              <span style={{ fontSize: 13.5, color: 'var(--muted)', display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                ما وصلك؟<button type="button" className="btn btn-g btn-sm" style={{ height: 30 }} onClick={() => (step === 'code' ? sendEmail() : sendPhone())}>أعد الإرسال</button>
                <button type="button" className="btn btn-g btn-sm" style={{ height: 30 }} onClick={() => { setStep('start'); setErr(''); }}>رجوع</button>
              </span>
              {step === 'code' && <span style={{ fontSize: 12.5, color: 'var(--faint)' }}>أو اضغط الرابط في البريد مباشرة.</span>}
            </form>
          )}
        </div>
      </div>
      <div style={{ padding: 20, textAlign: 'center', fontSize: 12.5, color: 'var(--faint)', display: 'flex', gap: 18, justifyContent: 'center' }}>
        <Link href="/privacy">الخصوصية</Link><Link href="/terms">الشروط</Link><span>© NAS</span>
      </div>
    </div>
  );
}
