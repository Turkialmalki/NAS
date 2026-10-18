'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { FilmRow, Person } from '@/lib/data';
import { ar, code, ROLE } from '@/lib/fmt';
import { Icon, Spinner } from '../Icon';
import { PageHead } from './ui';
import { assignMany, invite, removeMember, cancelInvite } from '@/app/app/jury/actions';

export function JuryBoard({ films, people, invites, openInvite = false }: { films: FilmRow[]; people: Person[]; invites: { id: string; email: string; role: string; specialty: string | null }[]; openInvite?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState('');
  const [inviting, setInviting] = useState(openInvite);
  const reviewers = people.filter((p) => p.role === 'reviewer');
  const load = (id: string) => films.filter((f) => f.assignments.some((a) => a.reviewer_id === id));
  const unassigned = films.filter((f) => f.assignments.length === 0);
  // suggestion: analysis pick, else the reviewer with the fewest open films (balanced as we go)
  const open = new Map(reviewers.map((r) => [r.user_id, load(r.user_id).filter((f) => !f.reviews.some((x) => x.reviewer_id === r.user_id)).length]));
  const plan = unassigned.map((f) => {
    let r = f.analysis?.suggested_reviewer && open.has(f.analysis.suggested_reviewer) ? f.analysis.suggested_reviewer : null;
    if (!r && reviewers.length) r = [...open.entries()].sort((a, b) => a[1] - b[1])[0][0];
    if (r) open.set(r, (open.get(r) || 0) + 1);
    return { f, r };
  });
  const nm = (id: string | null) => reviewers.find((r) => r.user_id === id)?.name || '—';
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) => start(async () => { const r = await fn(); setMsg(r.ok ? ok : r.error || 'تعذّر التنفيذ'); router.refresh(); setTimeout(() => setMsg(''), 2600); });

  return (
    <>
      <PageHead title="لجنة التحكيم" sub="كل محكّم يشوف الأفلام المسندة له فقط." right={<button type="button" className="btn btn-p btn-sm" onClick={() => setInviting(true)}><Icon name="plus" size={16} />ادعُ عضوًا</button>} />
      {reviewers.length === 0 ? (
        <div className="card empty" style={{ borderRadius: 20 }}>ما أضفت محكّمين بعد. ادعُهم ببريدهم، ويدخلون مباشرة على أفلامهم.</div>
      ) : (
        <div className="g4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
          {reviewers.map((p) => {
            const mine = load(p.user_id); const doneN = mine.filter((f) => f.reviews.some((x) => x.reviewer_id === p.user_id)).length;
            const r = mine.length ? doneN / mine.length : 0;
            return (
              <div key={p.user_id} className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <span style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span className="av" style={{ margin: 0, width: 38, height: 38, fontSize: 14 }}>{p.name.slice(0, 1)}</span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}><b style={{ fontSize: 15 }}>{p.name}</b><span style={{ fontSize: 12.5, color: 'var(--faint)' }}>{p.specialty || 'كل الأقسام'}</span></span>
                  <button type="button" className="ibtn" style={{ width: 28, height: 28 }} aria-label="إزالة" onClick={() => confirm(`إزالة ${p.name} من اللجنة؟`) && run(() => removeMember(p.user_id), 'أُزيل العضو')}><Icon name="x" size={13} /></button>
                </span>
                <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}><span style={{ color: 'var(--muted)' }}>أنهى</span><b className="num">{ar(doneN)} من {ar(mine.length)}</b></span>
                <span className="bar"><span style={{ width: `${Math.round(r * 100)}%` }} /></span>
              </div>
            );
          })}
        </div>
      )}

      <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><b style={{ fontSize: 17 }}>أفلام بدون محكّم <span className="num" style={{ color: 'var(--faint)' }}>({ar(unassigned.length)})</span></b><span style={{ fontSize: 13.5, color: 'var(--muted)' }}>رشّح NAS محكّمًا لكل فيلم حسب التخصص وتوازن الأعباء.</span></span>
          {plan.length > 0 && reviewers.length > 0 && <button type="button" className="btn btn-p btn-sm" disabled={pending} onClick={() => run(() => assignMany(plan.filter((p) => p.r).map((p) => ({ s: p.f.id, r: p.r! }))), 'تم توزيع الأفلام')}>{pending ? <Spinner size={14} /> : <Icon name="spark" size={15} />}وزّع الكل حسب الترشيح</button>}
        </div>
        {plan.length === 0 && <span style={{ fontSize: 14, color: 'var(--muted)', padding: '10px 0' }}>كل الأفلام موزّعة ✓</span>}
        {plan.map(({ f, r }) => (
          <div key={f.id} className="row" style={{ padding: '12px 0' }}>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}><b style={{ fontSize: 14.5 }}>{f.title}</b><span style={{ fontSize: 13, color: 'var(--muted)' }}><span className="num" style={{ direction: 'ltr', display: 'inline-block' }}>{code(f.ref_code)}</span> · {[f.genre, f.duration_min ? `${ar(f.duration_min)} د` : ''].filter(Boolean).join(' · ')}</span></span>
            {r && <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}><span style={{ fontSize: 13.5, color: 'var(--accHi)' }}>✦ {nm(r)}</span><button type="button" className="btn btn-q btn-sm" disabled={pending} onClick={() => run(() => assignMany([{ s: f.id, r }]), 'تم الإسناد')}>أسند</button></span>}
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: '22px 24px' }}>
        <b style={{ fontSize: 16, display: 'block', marginBottom: 6 }}>الفريق</b>
        {people.filter((p) => p.role !== 'reviewer').map((p) => (
          <div key={p.user_id} className="row"><span style={{ display: 'flex', gap: 12, alignItems: 'center' }}><span className="av" style={{ margin: 0 }}>{p.name.slice(0, 1)}</span><span style={{ display: 'flex', flexDirection: 'column' }}><b>{p.name}</b><span className="num" style={{ fontSize: 12.5, color: 'var(--faint)' }}>{p.email}</span></span></span><span className="chip c-acc">{ROLE[p.role]}</span></div>
        ))}
        {invites.map((i) => (
          <div key={i.id} className="row"><span style={{ display: 'flex', flexDirection: 'column' }}><b className="num" style={{ direction: 'ltr', textAlign: 'end' }}>{i.email}</b><span style={{ fontSize: 12.5, color: 'var(--faint)' }}>بانتظار أول دخول · {ROLE[i.role]}</span></span><button type="button" className="btn btn-g btn-sm" onClick={() => run(() => cancelInvite(i.id), 'أُلغيت الدعوة')}>إلغاء</button></div>
        ))}
      </div>

      {inviting && (
        <div className="modal-bg" role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && setInviting(false)}>
          <form className="card rise" style={{ width: '100%', maxWidth: 440, padding: 28, borderRadius: 24, display: 'flex', flexDirection: 'column', gap: 14 }}
            action={(fd) => start(async () => { const r = await invite(fd); setMsg(r.ok ? (r.state === 'added' ? 'أُضيف العضو' : r.state === 'already_member' ? 'هذا الشخص عضو في فريق المهرجان بالفعل' : 'أُرسلت الدعوة — يدخل ببريده') : r.error || 'تعذّر'); if (r.ok) setInviting(false); router.refresh(); setTimeout(() => setMsg(''), 3000); })}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h2 style={{ fontSize: 22 }}>ادعُ عضوًا</h2><button type="button" className="ibtn" onClick={() => setInviting(false)} aria-label="إغلاق"><Icon name="x" /></button></div>
            <label className="lbl">البريد الإلكتروني<input name="email" className="fld" dir="ltr" type="email" required /></label>
            <label className="lbl">الدور<select name="role" className="fld"><option value="reviewer">محكّم</option><option value="programmer">مبرمج</option><option value="manager">مدير</option></select></label>
            <label className="lbl">التخصص <span className="hint">للمحكّمين، يساعد في الترشيح</span><input name="specialty" className="fld" placeholder="مثلًا: وثائقي، روائي، تحريك" /></label>
            <button className="btn btn-p btn-lg" disabled={pending}>{pending ? 'نضيف…' : 'أضف'}</button>
            <span className="hint" style={{ textAlign: 'center' }}>يسجّل الدخول بهذا البريد من صفحة الدخول، ويظهر له المهرجان تلقائيًا.</span>
          </form>
        </div>
      )}
      {msg && <div className="toast">{msg}</div>}
    </>
  );
}
