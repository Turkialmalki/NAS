'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase/client';
import { LogoMark } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { Icon, Spinner } from './Icon';

type Step = 'start' | 'code' | 'phone' | 'phoneCode';
const LEN = 6;  // shortest code length Supabase sends
const MAX = 10; // longest

const GoogleG = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" /><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" /><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" /><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" /></svg>
);
const AppleA = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.37 12.6c-.02-2.2 1.8-3.26 1.88-3.31-1.03-1.5-2.62-1.7-3.18-1.73-1.35-.14-2.64.8-3.33.8-.69 0-1.74-.78-2.87-.76-1.47.02-2.83.86-3.59 2.18-1.53 2.66-.39 6.6 1.1 8.75.73 1.05 1.6 2.24 2.73 2.2 1.1-.05 1.51-.71 2.84-.71 1.32 0 1.7.71 2.86.69 1.18-.02 1.93-1.07 2.65-2.13.84-1.22 1.18-2.4 1.2-2.46-.03-.01-2.3-.88-2.32-3.52zM14.2 6.13c.6-.73 1.01-1.75.9-2.76-.87.04-1.92.58-2.54 1.31-.56.64-1.05 1.67-.92 2.66.97.08 1.96-.49 2.56-1.21z" /></svg>
);

/** Code entry that works for 6–10 digit codes (Supabase lets the project choose the length).
 *  One real input under the boxes, so paste, autofill and the phone keyboard all just work. */
function OtpBoxes({ value, onChange, onDone, bad }: { value: string; onChange: (v: string) => void; onDone: (v: string) => void; bad: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const idle = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => { ref.current?.focus(); return () => clearTimeout(idle.current); }, []);
  const n = Math.min(MAX, Math.max(LEN, value.length + (value.length >= LEN && value.length < MAX ? 0 : 0)));
  const take = (raw: string, pasted: boolean) => {
    const c = raw.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/\D/g, '').slice(0, MAX);
    onChange(c);
    clearTimeout(idle.current);
    if (c.length >= LEN) idle.current = setTimeout(() => onDone(c), pasted || c.length === MAX ? 50 : 900);
  };
  return (
    <div className="otp" data-bad={bad || undefined} style={{ position: 'relative' }} onClick={() => ref.current?.focus()}>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className="otp-cell" data-f={value[i] ? 1 : undefined} data-cur={i === Math.min(value.length, n - 1) ? 1 : undefined}>{value[i] || ''}</span>
      ))}
      <input ref={ref} inputMode="numeric" autoComplete="one-time-code" aria-label="رمز الدخول" value={value} maxLength={MAX}
        onChange={(e) => take(e.target.value, false)} onPaste={(e) => { e.preventDefault(); take(e.clipboardData.getData('text'), true); }}
        style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', fontSize: 16, caretColor: 'transparent' }} />
    </div>
  );
}

export function LoginForm({ signup: initialSignup, next, linkError }: { signup: boolean; next: string; linkError: boolean }) {
  const [up, setUp] = useState(initialSignup);
  const [step, setStep] = useState<Step>('start');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+966');
  const [name, setName] = useState('');
  const [festival, setFestival] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [bad, setBad] = useState(false);
  const [wait, setWait] = useState(0);
  const [note, setNote] = useState('');
  // show only the sign-in methods that are switched on in Supabase
  const [alts, setAlts] = useState<('google' | 'apple' | 'phone')[]>([]);
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! } })
      .then((r) => r.json()).then((j: { external?: Record<string, boolean> }) => {
        const e = j.external || {};
        setAlts([e.google && 'google', e.apple && 'apple', e.phone && 'phone'].filter(Boolean) as ('google' | 'apple' | 'phone')[]);
      }).catch(() => {});
  }, []);
  const [err, setErr] = useState(linkError ? 'انتهت صلاحية الرابط. اطلب رمزًا جديدًا.' : '');
  const sb = supabaseBrowser();
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const redirect = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
  const meta = up ? { full_name: name || undefined, festival: festival || undefined } : undefined;

  useEffect(() => { if (wait <= 0) return; const t = setTimeout(() => setWait(wait - 1), 1000); return () => clearTimeout(t); }, [wait]);
  // if the email link is opened in another tab, this tab notices the new session and continues
  useEffect(() => {
    if (step !== 'code' && step !== 'phoneCode') return;
    const t = setInterval(async () => { const { data } = await sb.auth.getSession(); if (data.session) window.location.assign(next); }, 2500);
    return () => clearInterval(t);
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  async function oauth(provider: 'google' | 'apple') {
    setErr('');
    const { error } = await sb.auth.signInWithOAuth({ provider, options: { redirectTo: redirect } });
    if (error) setErr(provider === 'google' ? 'الدخول عبر Google غير مفعّل بعد. استخدم البريد الإلكتروني.' : 'الدخول عبر Apple غير مفعّل بعد. استخدم البريد الإلكتروني.');
  }
  async function sendEmail(e?: React.FormEvent) {
    e?.preventDefault();
    const em = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(em)) { setErr('اكتب بريدًا إلكترونيًا صحيحًا.'); return; }
    setBusy(true); setErr('');
    const { error } = await sb.auth.signInWithOtp({ email: em, options: { emailRedirectTo: redirect, shouldCreateUser: true, data: meta } });
    setBusy(false);
    if (error) {
      if (/rate|seconds|too many/i.test(error.message)) {
        // a message was already sent recently: go straight to it instead of blocking
        setEmail(em); setStep('code'); setCode(''); setBad(false); setWait(60);
        setNote('أرسلنا لك رسالة دخول قبل قليل. افتح آخر رسالة من NAS في بريدك.');
        return;
      }
      setErr('تعذّر الإرسال، حاول مرة أخرى.'); return;
    }
    setNote('');
    setEmail(em); setStep('code'); setCode(''); setBad(false); setWait(60);
  }
  async function sendPhone(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true); setErr('');
    const { error } = await sb.auth.signInWithOtp({ phone: phone.replace(/\s/g, ''), options: { data: meta } });
    setBusy(false);
    if (error) { setErr('الدخول برقم الجوال غير مفعّل بعد. استخدم البريد الإلكتروني.'); return; }
    setStep('phoneCode'); setCode(''); setBad(false); setWait(60);
  }
  async function verify(token = code) {
    if (token.length < LEN || busy) return;
    setBusy(true); setErr(''); setBad(false);
    const res = step === 'phoneCode'
      ? await sb.auth.verifyOtp({ phone: phone.replace(/\s/g, ''), token, type: 'sms' })
      : await sb.auth.verifyOtp({ email, token, type: 'email' });
    if (res.error) { setBusy(false); setBad(true); setCode(''); setErr('الرمز غير صحيح أو انتهت صلاحيته.'); return; }
    window.location.assign(next); // full load so the dashboard opens fresh with the new session
  }
  const back = () => { setStep('start'); setErr(''); setCode(''); setBad(false); };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--glow), var(--bg)' }}>
      <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
        <Link href="/" style={{ fontSize: 14, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ transform: 'scaleX(-1)', display: 'inline-flex' }}><Icon name="arrow" size={15} stroke={2} /></span>العودة للموقع</Link>
        <ThemeToggle />
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 16px 48px' }}>
        <div className="auth-card rise" style={{ maxWidth: 440, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
          <LogoMark height={40} id="lgs" />

          {step === 'start' && (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <h1 style={{ fontSize: 28 }}>{up ? 'أنشئ حسابك' : 'أهلًا بك'}</h1>
                <span style={{ color: 'var(--muted)', fontSize: 15, lineHeight: 1.7 }}>اكتب بريدك وسنرسل لك رمز دخول. بدون كلمة مرور.</span>
              </div>

              <form onSubmit={sendEmail} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {up && (
                  <div className="g2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <input className="fld" value={name} onChange={(e) => setName(e.target.value)} placeholder="اسمك" aria-label="الاسم" autoComplete="name" style={{ height: 52, borderRadius: 14 }} />
                    <input className="fld" value={festival} onChange={(e) => setFestival(e.target.value)} placeholder="المهرجان (اختياري)" aria-label="المهرجان" style={{ height: 52, borderRadius: 14 }} />
                  </div>
                )}
                <label style={{ position: 'relative', display: 'block' }}>
                  <span style={{ position: 'absolute', left: 16, top: 18, color: 'var(--faint)', display: 'inline-flex', pointerEvents: 'none' }}><Icon name="mail" size={18} /></span>
                  <input className="fld" dir="ltr" type="email" inputMode="email" autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" aria-label="البريد الإلكتروني"
                    style={{ height: 54, borderRadius: 14, paddingLeft: 46, paddingRight: 16, fontSize: 16, textAlign: 'right' }} />
                </label>
                <button className="btn btn-p btn-lg" disabled={busy} style={{ width: '100%', height: 54, borderRadius: 14 }}>
                  {busy ? <><Spinner size={16} />نرسل الرمز…</> : <>أرسل رمز الدخول<Icon name="arrow" size={17} stroke={2.2} /></>}
                </button>
              </form>
              {err && <span className="err" style={{ textAlign: 'center' }}>{err}</span>}

              {alts.length > 0 && <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--faint)', fontSize: 13 }}><span style={{ flex: 1, height: 1, background: 'var(--line)' }} />أو<span style={{ flex: 1, height: 1, background: 'var(--line)' }} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: alts.length === 1 ? '1fr' : '1fr 1fr', gap: 10 }}>
                  {alts.includes('google') && <button type="button" className="alt-btn" style={{ gridColumn: alts.length === 3 ? '1 / -1' : undefined }} onClick={() => oauth('google')}><GoogleG />المتابعة عبر Google</button>}
                  {alts.includes('apple') && <button type="button" className="alt-btn" onClick={() => oauth('apple')}><AppleA />{alts.length === 1 ? 'المتابعة عبر Apple' : 'Apple'}</button>}
                  {alts.includes('phone') && <button type="button" className="alt-btn" onClick={() => { setErr(''); setStep('phone'); }}><Icon name="phone" size={16} stroke={2} />رقم الجوال</button>}
                </div>
              </>}

              <span style={{ fontSize: 13.5, color: 'var(--muted)', textAlign: 'center' }}>
                {up ? 'عندك حساب؟ ' : 'جديد في NAS؟ '}
                <button type="button" onClick={() => setUp(!up)} style={{ background: 'none', border: 0, padding: 0, color: 'var(--accHi)', font: 'inherit', fontWeight: 600, cursor: 'pointer' }}>{up ? 'سجّل الدخول' : 'أنشئ حسابًا'}</button>
              </span>
              <span style={{ fontSize: 12, color: 'var(--faint)', textAlign: 'center', lineHeight: 1.7 }}>بالمتابعة توافق على <Link href="/terms" style={{ textDecoration: 'underline' }}>الشروط</Link> و<Link href="/privacy" style={{ textDecoration: 'underline' }}>سياسة الخصوصية</Link>.</span>
            </div>
          )}

          {step === 'phone' && (
            <form onSubmit={sendPhone} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'center' }}>
              <h1 style={{ fontSize: 28 }}>رقم الجوال</h1>
              <span style={{ color: 'var(--muted)', fontSize: 15 }}>سنرسل لك رمزًا برسالة نصية.</span>
              <input className="fld num" dir="ltr" type="tel" autoComplete="tel" autoFocus value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+9665XXXXXXXX" aria-label="رقم الجوال" style={{ height: 56, borderRadius: 14, fontSize: 19, textAlign: 'center' }} />
              {err && <span className="err">{err}</span>}
              <button className="btn btn-p btn-lg" disabled={busy} style={{ height: 54, borderRadius: 14 }}>{busy ? <><Spinner size={16} />نرسل…</> : 'أرسل الرمز'}</button>
              <button type="button" className="btn btn-g btn-sm" onClick={back}>رجوع</button>
            </form>
          )}

          {(step === 'code' || step === 'phoneCode') && (
            <form onSubmit={(e) => { e.preventDefault(); verify(); }} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, textAlign: 'center' }}>
              <span className="drop-ic" style={{ width: 56, height: 56 }}><Icon name={step === 'code' ? 'mail' : 'phone'} size={24} /></span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <h1 style={{ fontSize: 28 }}>اكتب رمز الدخول</h1>
                <span style={{ color: 'var(--muted)', fontSize: 15, lineHeight: 1.8 }}>أرسلنا رمز الدخول إلى<br />
                  <b className="num" style={{ color: 'var(--ink)', direction: 'ltr', display: 'inline-block' }}>{step === 'code' ? email : phone}</b>
                  <button type="button" onClick={back} style={{ background: 'none', border: 0, color: 'var(--accHi)', font: 'inherit', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', marginInlineStart: 8 }}>تغيير</button>
                </span>
              </div>
              {note && <span style={{ fontSize: 13.5, color: 'var(--accHi)', background: 'var(--accT)', padding: '10px 14px', borderRadius: 12, lineHeight: 1.7 }}>{note}</span>}
              {step === 'code' && <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--faint)' }}><Spinner size={12} />أو اضغط الرابط في الرسالة وستنتقل تلقائيًا</span>}
              <OtpBoxes value={code} onChange={(v) => { setCode(v); setBad(false); }} onDone={verify} bad={bad} />
              {err && <span className="err">{err}</span>}
              <button className="btn btn-p btn-lg" style={{ width: '100%', height: 54, borderRadius: 14 }} disabled={busy || code.length < LEN}>{busy ? <><Spinner size={16} />نتحقق…</> : 'دخول'}</button>
              <span style={{ fontSize: 13.5, color: 'var(--muted)' }}>
                {wait > 0 ? <>إعادة الإرسال بعد <b className="num">{wait}</b> ثانية</> : <>ما وصلك؟ <button type="button" onClick={() => (step === 'code' ? sendEmail() : sendPhone())} style={{ background: 'none', border: 0, padding: 0, color: 'var(--accHi)', font: 'inherit', fontWeight: 600, cursor: 'pointer' }}>أعد الإرسال</button></>}
              </span>
              {step === 'code' && <span style={{ fontSize: 12.5, color: 'var(--faint)', lineHeight: 1.7 }}>استخدم آخر رسالة وصلتك، فكل طلب جديد يلغي الرمز السابق. تأكد من مجلد الرسائل غير المرغوب فيها.</span>}
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
