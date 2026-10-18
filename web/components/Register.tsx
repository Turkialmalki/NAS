'use client';
import { useState, useTransition } from 'react';
import { register, type Role } from '@/app/actions/register';
import { LogoMark } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { LangToggle, useT } from './Lang';
import { Icon, Spinner } from './Icon';

const ROLES: { id: Role; icon: string; title: string; body: string; points: string[] }[] = [
  { id: 'festival', icon: 'grid', title: 'أنظّم مهرجانًا', body: 'أستقبل الأفلام، وأدير لجنة التحكيم والقرارات والبرنامج.',
    points: ['أنشئ مهرجانك من ملف أو باسمه فقط', 'غرفة قيادة لكل الدورة', 'برنامج عروض بلا تعارضات'] },
  { id: 'filmmaker', icon: 'film', title: 'صانع أفلام', body: 'أرفع أفلامي، وأقدّمها للمهرجانات، وأتابع النتائج.',
    points: ['NAS Vision يجهّز ملف فيلمك', 'مهرجانات مقترحة تناسب فيلمك', 'تقديم بضغطة ومتابعة حتى النتيجة'] },
  { id: 'judge', icon: 'play', title: 'محكّم', body: 'أشاهد الأفلام المسندة إليّ وأقيّمها بمعايير المهرجان.',
    points: ['أفلامك فقط، بنسخة محمية', 'تقييم بالنقرات', 'موعد واضح لكل فيلم'] },
];

/** First sign-in: name, then the role that decides the user's home. */
export function Register({ name: initialName, email, initialRole, invites }: { name: string; email: string; initialRole: Role | null; invites: string[] }) {
  const t = useT();
  const [step, setStep] = useState<0 | 1>(initialName.trim().length >= 2 ? 1 : 0);
  const [name, setName] = useState(initialName);
  const [role, setRole] = useState<Role | null>(initialRole || (invites.length ? 'judge' : null));
  const [err, setErr] = useState('');
  const [pending, start] = useTransition();
  const okName = name.trim().length >= 2;

  const finish = () => {
    if (!role) { setErr(t('اختر دورك للمتابعة.')); return; }
    setErr('');
    start(async () => {
      const r = await register(name, role);
      if (!r.ok || !r.to) { setErr(r.error === 'name' ? t('اكتب اسمك (حرفان على الأقل).') : t('تعذّر الحفظ، حاول مرة أخرى.')); return; }
      window.location.assign(r.to);
    });
  };

  return (
    <div className="reg">
      <div className="reg-top">
        <LogoMark height={30} id="lgreg" />
        <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}><LangToggle /><ThemeToggle />
          <form action="/auth/signout" method="post"><button className="ibtn" aria-label={t('تسجيل الخروج')}><Icon name="out" size={16} /></button></form></span>
      </div>
      <div className="reg-steps" aria-hidden="true"><span className="on" /><span className={step === 1 ? 'on' : ''} /></div>

      {step === 0 ? (
        <form className="reg-body rise" key="s0" onSubmit={(e) => { e.preventDefault(); if (okName) setStep(1); }}>
          <h1 className="display">{t('أهلًا بك في NAS')}</h1>
          <p>{t('خطوتان وتصبح مساحتك جاهزة. ما اسمك؟')}</p>
          <input className="fld reg-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={t('الاسم الكامل')} aria-label={t('الاسم الكامل')} autoComplete="name" maxLength={80} />
          <span className="hint" dir="ltr">{email}</span>
          <button className="btn btn-p btn-lg reg-go" disabled={!okName}>{t('متابعة')}<Icon name="arrow" size={16} stroke={2.2} className="fwd" /></button>
        </form>
      ) : (
        <div className="reg-body wide rise" key="s1">
          <h1 className="display">{t('كيف ستستخدم NAS؟')}</h1>
          <p>{t('نجهّز لك مساحة تناسب دورك. يمكنك تغييره لاحقًا من الإعدادات.')}</p>
          <div className="reg-roles" role="radiogroup" aria-label={t('دورك')}>
            {ROLES.map((r) => (
              <button key={r.id} type="button" role="radio" aria-checked={role === r.id} className={`reg-role ${role === r.id ? 'on' : ''}`} onClick={() => { setRole(r.id); setErr(''); }}>
                <span className="reg-radio" />
                <span className="sn-ic" style={{ width: 46, height: 46, borderRadius: 14 }}><Icon name={r.icon} size={21} /></span>
                <b className="display">{t(r.title)}</b>
                <span className="reg-desc">{t(r.body)}</span>
                <ul>{r.points.map((p) => <li key={p}><Icon name="check" size={13} stroke={2.8} />{t(p)}</li>)}</ul>
                {r.id === 'judge' && (invites.length
                  ? <span className="reg-note ok"><Icon name="mail" size={13} />{t('لديك دعوة من {f}', { f: invites.join(t('، ')) })}</span>
                  : <span className="reg-note">{t('يدعوك المهرجان على بريدك، وتظهر أفلامك هنا فور الإسناد.')}</span>)}
              </button>
            ))}
          </div>
          {err && <span className="err" role="alert">{err}</span>}
          <div className="reg-actions">
            <button type="button" className="btn btn-g" onClick={() => setStep(0)}><Icon name="arrow" size={15} className="back" />{t('رجوع')}</button>
            <button type="button" className="btn btn-p btn-lg" disabled={pending || !role} onClick={finish} style={{ minWidth: 220 }}>
              {pending ? <Spinner size={16} /> : <>{t('جهّز مساحتي')}<Icon name="arrow" size={16} stroke={2.2} className="fwd" /></>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
