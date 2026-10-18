import Link from 'next/link';
import { requireStaff } from '@/lib/ctx';
import { getT } from '@/lib/i18n/server';
import { Icon } from '@/components/Icon';
import { CopyLink } from '@/components/app/CopyLink';

type Sub = { id: string; title: string; genre: string | null; status: string; decision: string; decision_published: boolean; created_at: string; category_id: string | null; analyses: { score: number | null; checks: { ok: boolean; text: string }[] } | { score: number | null; checks: { ok: boolean; text: string }[] }[] | null };
type Asg = { submission_id: string; reviewer_id: string; status: string; due_at: string | null };

const DAY = 86400000;

export default async function Command({ searchParams }: { searchParams: Promise<{ created?: string }> }) {
  const justCreated = (await searchParams).created === '1';
  const t = await getT();
  const { sb, festival, name } = await requireStaff();
  const [{ data: s0 }, { data: a0 }, { data: r0 }, { data: m0 }, { data: cats }, { data: crit }, { data: logs }, { count: screenings }] = await Promise.all([
    sb.from('submissions').select('id,title,genre,status,decision,decision_published,created_at,category_id,analyses(score,checks)').eq('festival_id', festival.id),
    sb.from('assignments').select('submission_id,reviewer_id,status,due_at,submissions!inner(festival_id)').eq('submissions.festival_id', festival.id),
    sb.from('reviews').select('submission_id,reviewer_id,submissions!inner(festival_id)').eq('submissions.festival_id', festival.id),
    sb.from('festival_members').select('user_id,role,profiles:profiles!inner(full_name,email)').eq('festival_id', festival.id),
    sb.from('categories').select('id,name').eq('festival_id', festival.id).order('sort'),
    sb.from('criteria').select('id').eq('festival_id', festival.id),
    sb.from('audit_log').select('actor_label,action,target,created_at').eq('festival_id', festival.id).order('created_at', { ascending: false }).limit(7),
    sb.from('screenings').select('id', { count: 'exact', head: true }).eq('festival_id', festival.id),
  ]);
  const subs = (s0 || []) as unknown as Sub[];
  const asg = (a0 || []) as unknown as Asg[];
  const reviews = new Set((r0 || []).map((r) => `${r.submission_id}:${r.reviewer_id}`));
  const an = (s: Sub) => (Array.isArray(s.analyses) ? s.analyses[0] : s.analyses) || null;
  const people = (m0 || []).map((m) => { const p = (Array.isArray(m.profiles) ? m.profiles[0] : m.profiles) as { full_name: string | null; email: string | null } | null; return { id: m.user_id, role: m.role, name: p?.full_name || p?.email?.split('@')[0] || t('عضو') }; });
  const jury = people.filter((p) => p.role === 'reviewer');
  const now = Date.now();

  // ---- numbers
  const assigned = new Set(asg.map((a) => a.submission_id));
  const analyzed = subs.filter((s) => an(s)).length;
  const reviewedN = subs.filter((s) => s.status === 'reviewed').length;
  const decided = subs.filter((s) => s.decision !== 'pending').length;
  const waiting = subs.filter((s) => s.status === 'reviewed' && s.decision === 'pending').length;
  const unassigned = subs.filter((s) => !assigned.has(s.id)).length;
  const broken = subs.filter((s) => (an(s)?.checks || []).some((c) => !c.ok && /رابط|link/i.test(c.text))).length;
  const overdue = asg.filter((a) => a.due_at && new Date(a.due_at).getTime() < now && !reviews.has(`${a.submission_id}:${a.reviewer_id}`));
  const scores = subs.map((s) => an(s)?.score).filter((x): x is number => x != null).map(Number);
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  const days = Array.from({ length: 14 }, (_, i) => { const d0 = new Date(now - (13 - i) * DAY); d0.setHours(0, 0, 0, 0); const d1 = d0.getTime() + DAY; return subs.filter((s) => { const x = new Date(s.created_at).getTime(); return x >= d0.getTime() && x < d1; }).length; });
  const week = days.slice(7).reduce((a, b) => a + b, 0), prev = days.slice(0, 7).reduce((a, b) => a + b, 0);
  const left = festival.submissions_close ? Math.ceil((new Date(festival.submissions_close).getTime() - now) / DAY) : null;
  const juryDone = asg.filter((a) => reviews.has(`${a.submission_id}:${a.reviewer_id}`)).length;

  // ---- setup checklist (only until the festival is ready)
  const setup = [
    { ok: (festival.description || '').trim().length >= 30 && !!festival.submissions_close, l: t('اكتب نبذة وحدّد موعد الإغلاق ليظهر مهرجانك في الدليل'), h: '/app/settings' },
    { ok: (cats || []).length > 0, l: t('أضف أقسام المسابقة'), h: '/app/settings' },
    { ok: (crit || []).length > 0, l: t('حدّد معايير التقييم'), h: '/app/settings' },
    { ok: jury.length > 0, l: t('ادعُ لجنة التحكيم'), h: '/app/jury?invite=1' },
    { ok: festival.status === 'open', l: t('انشر صفحة التقديم'), h: '/app/settings' },
  ];
  const setupDone = setup.filter((x) => x.ok).length;

  // ---- what needs you today
  const todo: { tone: 'acc' | 'no' | 'ok'; l: string; p: string; a: string; h: string }[] = [];
  if (festival.status === 'draft') todo.push({ tone: 'acc', l: t('صفحة التقديم غير منشورة'), p: t('انشرها ليبدأ استقبال الأفلام.'), a: t('انشر'), h: '/app/settings' });
  if (waiting) todo.push({ tone: 'acc', l: t('{n} فيلم ينتظر قرارك', { n: waiting }), p: t('اكتملت تقييمات اللجنة عليها.'), a: t('راجعها'), h: `/app/films?ai=${encodeURIComponent(t('بانتظار القرار'))}` });
  if (unassigned && jury.length) todo.push({ tone: 'acc', l: t('{n} فيلم بدون محكّم', { n: unassigned }), p: t('جهّزنا توزيعًا متوازنًا حسب التخصص وحِمل كل محكّم.'), a: t('وزّعها'), h: '/app/jury' });
  if (overdue.length) todo.push({ tone: 'no', l: t('{n} تقييم تجاوز الموعد', { n: overdue.length }), p: t('ذكّر المحكّمين المتأخرين من صفحة اللجنة.'), a: t('اللجنة'), h: '/app/jury' });
  if (broken) todo.push({ tone: 'no', l: t('{n} رابط مشاهدة لا يعمل', { n: broken }), p: t('تواصل مع أصحابها لتحديث الروابط.'), a: t('اعرضها'), h: `/app/films?ai=${encodeURIComponent(t('روابط لا تعمل'))}` });
  if (decided && !screenings) todo.push({ tone: 'acc', l: t('ابدأ جدول العروض'), p: t('NAS يقترح جدولًا كاملًا للأفلام المقبولة في ثوانٍ.'), a: t('اقترح جدولًا'), h: '/app/programme?auto=1' });

  // ---- NAS brief: a few honest sentences computed from the data
  const brief: string[] = [];
  if (subs.length) {
    brief.push(week > prev ? t('وصلتك {n} مشاركة هذا الأسبوع، أكثر من الأسبوع الماضي.', { n: week }) : week ? t('وصلتك {n} مشاركة هذا الأسبوع.', { n: week }) : t('لم تصل مشاركات جديدة هذا الأسبوع.'));
    const g = topOf(subs.map((s) => s.genre).filter(Boolean) as string[]);
    if (g) brief.push(t('أكثر الأنواع حضورًا: {g} بنسبة {p}%.', { g: t(g[0]), p: Math.round((g[1] / subs.length) * 100) }));
    if (avg != null) brief.push(t('متوسط تقييم NAS Vision للأفلام {s} من 10.', { s: t.n(avg.toFixed(1)) }));
    if (asg.length) brief.push(t('أنجزت اللجنة {p}% من التقييمات.', { p: Math.round((juryDone / asg.length) * 100) }));
    if (left != null && left >= 0 && festival.status === 'open') brief.push(left <= 7 ? t('يغلق التقديم بعد {n} أيام، والعادة أن تصل أغلب المشاركات في الأيام الأخيرة.', { n: left }) : t('باقي {n} يومًا على إغلاق التقديم.', { n: left }));
  }

  const pipe = [
    { l: t('وصلت'), v: subs.length, h: '/app/films' },
    { l: t('حُلّلت'), v: analyzed, h: '/app/films' },
    { l: t('وُزّعت'), v: assigned.size, h: '/app/jury' },
    { l: t('قُيّمت'), v: reviewedN, h: `/app/films?ai=${encodeURIComponent(t('اكتمل تقييمها'))}` },
    { l: t('حُسمت'), v: decided, h: `/app/films?ai=${encodeURIComponent(t('مقبولة'))}` },
  ];
  const catDist = (cats || []).map((c) => ({ l: c.name, v: subs.filter((s) => s.category_id === c.id).length })).filter((x) => x.v).sort((a, b) => b.v - a.v);
  const genreDist = count(subs.map((s) => s.genre).filter(Boolean) as string[]).slice(0, 5).map(([l, v]) => ({ l: t(l), v }));
  const hour = new Date().getHours();
  const statusChip = festival.status === 'open' ? ['c-ok', t('التقديم مفتوح')] : festival.status === 'closed' ? ['c-mute', t('التقديم مغلق')] : ['c-acc', t('مسودة')];
  const url = `https://nasfestivals.com/f/${festival.slug}`;

  return (
    <>
      <section className="cc-hero rise">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minWidth: 260 }}>
          <span className="eyebrow">{t(hour < 12 ? 'صباح الخير' : 'مساء الخير')}{t('، ')}{name.split(' ')[0]}</span>
          <h1 style={{ fontSize: 38, lineHeight: 1.2 }}>{festival.name}</h1>
          <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 14, color: 'var(--muted)' }}>
            <span className={`chip ${statusChip[0]}`}>{statusChip[1]}</span>
            {left != null && left >= 0 && festival.status === 'open' && <span>{t('يغلق بعد {n} يومًا', { n: left })}</span>}
            {festival.starts_on && <span>· {t('الافتتاح {d}', { d: t.date(festival.starts_on) })}</span>}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <CopyLink url={url} />
          <Link href={`/f/${festival.slug}`} target="_blank" className="btn btn-s btn-sm"><Icon name="globe" size={15} />{t('صفحة التقديم')}</Link>
        </div>
      </section>

      {justCreated && (
        <div className="card rise" style={{ padding: '16px 20px', display: 'flex', gap: 12, alignItems: 'center', borderColor: 'rgba(95,212,154,.35)', background: 'var(--okT)' }}>
          <span style={{ color: 'var(--ok)', display: 'inline-flex' }}><Icon name="check" size={18} stroke={2.6} /></span>
          <span style={{ fontSize: 14.5 }}><b>{t('أُنشئ مهرجانك.')}</b> {t('أكمل الخطوات أدناه، ثم انشر صفحة التقديم.')}</span>
        </div>
      )}
      {setupDone < setup.length && (
        <div className="card setup">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span className="ring" style={{ width: 46, height: 46, background: `conic-gradient(var(--acc) 0 ${(setupDone / setup.length) * 100}%, var(--s3) 0 100%)` }}><span style={{ width: 38, height: 38, fontSize: 13, fontWeight: 700 }} className="num">{t.n(setupDone)}/{t.n(setup.length)}</span></span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><b style={{ fontSize: 17 }}>{t('جهّز مهرجانك')}</b><span style={{ fontSize: 13.5, color: 'var(--muted)' }}>{t('خطوات قليلة ويصبح مهرجانك جاهزًا لاستقبال الأفلام.')}</span></span>
          </div>
          <div className="setup-list">
            {setup.map((x) => (
              <Link key={x.l} href={x.h} className={`setup-i ${x.ok ? 'ok' : ''}`}>
                <span className="check">{x.ok && <Icon name="check" size={12} stroke={3.4} />}</span><span style={{ flex: 1 }}>{x.l}</span>{!x.ok && <Icon name="arrow" size={14} className="fwd" />}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="g4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
        <Link href="/app/films" className="card kpi">
          <span className="kpi-l">{t('المشاركات')}</span>
          <span style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}><b className="num kpi-v">{t.n(subs.length)}</b><Spark data={days} /></span>
          <span className={`kpi-d ${week >= prev ? 'up' : ''}`}>{week ? t('+{n} هذا الأسبوع', { n: week }) : t('لا جديد هذا الأسبوع')}</span>
        </Link>
        <Link href={`/app/films?ai=${encodeURIComponent(t('بانتظار القرار'))}`} className="card kpi"><span className="kpi-l">{t('تنتظر قرارك')}</span><b className="num kpi-v" style={{ color: waiting ? 'var(--acc)' : undefined }}>{t.n(waiting)}</b><span className="kpi-d">{t('اكتمل تقييمها')}</span></Link>
        <Link href="/app/jury" className="card kpi"><span className="kpi-l">{t('تقدّم التحكيم')}</span><b className="num kpi-v">{t.n(asg.length ? Math.round((juryDone / asg.length) * 100) : 0)}%</b><span className="kpi-d" style={{ color: overdue.length ? 'var(--no)' : undefined }}>{overdue.length ? t('{n} متأخر', { n: overdue.length }) : t('{a} من {b} تقييم', { a: juryDone, b: asg.length })}</span></Link>
        <div className="card kpi"><span className="kpi-l">{t('متوسط تقييم NAS')}</span><b className="num kpi-v">{avg != null ? t.n(avg.toFixed(1)) : '—'}</b><span className="kpi-d">{t('من {n} فيلم محلّل', { n: analyzed })}</span></div>
      </div>

      <div className="cc-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 4, borderColor: 'var(--accL)', background: 'linear-gradient(180deg, var(--accT), rgba(0,0,0,0) 55%), var(--s1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}><span style={{ color: 'var(--acc)' }}><Icon name="spark" size={19} /></span><b style={{ fontSize: 17 }}>{t('يحتاجك اليوم')}</b></div>
            {todo.length === 0 ? (
              <div className="row" style={{ padding: '14px 0' }}><span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}><b style={{ fontSize: 15 }}>{t('كل شيء على ما يرام')}</b><span style={{ fontSize: 13.5, color: 'var(--muted)' }}>{subs.length ? t('لا توجد مهام عاجلة اليوم.') : t('شارك رابط التقديم لتبدأ الأفلام بالوصول.')}</span></span></div>
            ) : todo.map((x) => (
              <div key={x.l} className="row" style={{ padding: '14px 0' }}>
                <span style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}><span className={`dot-${x.tone}`} /><span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}><b style={{ fontSize: 15 }}>{x.l}</b><span style={{ fontSize: 13.5, color: 'var(--muted)' }}>{x.p}</span></span></span>
                <Link href={x.h} className="btn btn-q btn-sm">{x.a}</Link>
              </div>
            ))}
          </div>

          <div className="card" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <b style={{ fontSize: 16 }}>{t('مسار الأفلام')}</b>
            <div className="pipe">
              {pipe.map((p, i) => (
                <Link key={p.l} href={p.h} className="pipe-i">
                  <b className="num">{t.n(p.v)}</b><span>{p.l}</span>
                  <span className="pipe-bar"><span style={{ width: `${subs.length ? (p.v / subs.length) * 100 : 0}%`, opacity: 1 - i * 0.12 }} /></span>
                </Link>
              ))}
            </div>
          </div>

          {(catDist.length > 0 || genreDist.length > 0) && (
            <div className="g2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
              {catDist.length > 0 && <Bars title={t('حسب القسم')} data={catDist} />}
              {genreDist.length > 0 && <Bars title={t('حسب النوع')} data={genreDist} />}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          {brief.length > 0 && (
            <div className="card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span className="eyebrow" style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Icon name="spark" size={13} />{t('موجز NAS')}</span>
              {brief.map((b) => <span key={b} style={{ fontSize: 14.5, lineHeight: 1.8, color: 'var(--ink2)' }}>{b}</span>)}
            </div>
          )}
          <div className="card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><b style={{ fontSize: 16 }}>{t('لجنة التحكيم')}</b><Link href="/app/jury" className="link">{t('إدارة')}</Link></div>
            {jury.length === 0 ? <span style={{ fontSize: 14, color: 'var(--muted)' }}>{t('لم تُضف محكّمين بعد.')} <Link href="/app/jury?invite=1" className="link">{t('ادعُ محكّمًا')}</Link></span>
              : jury.map((j) => {
                const mine = asg.filter((a) => a.reviewer_id === j.id); const d = mine.filter((a) => reviews.has(`${a.submission_id}:${j.id}`)).length;
                const late = overdue.filter((a) => a.reviewer_id === j.id).length;
                return (
                  <div key={j.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}><span>{j.name}</span><span className="num" style={{ color: late ? 'var(--no)' : 'var(--muted)', fontSize: 13 }}>{late ? t('{n} متأخر', { n: late }) : `${t.n(d)}/${t.n(mine.length)}`}</span></span>
                    <span className="pipe-bar"><span style={{ width: `${mine.length ? (d / mine.length) * 100 : 0}%`, background: d === mine.length && mine.length ? 'var(--ok)' : undefined }} /></span>
                  </div>
                );
              })}
          </div>
          {(logs || []).length > 0 && (
            <div className="card" style={{ padding: '20px 22px' }}>
              <b style={{ fontSize: 16, display: 'block', marginBottom: 4 }}>{t('آخر النشاط')}</b>
              {(logs || []).map((l, i) => (
                <div key={i} className="row" style={{ fontSize: 13.5 }}><span style={{ color: 'var(--ink2)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><b style={{ color: 'var(--ink)' }}>{l.actor_label || 'NAS'}</b> · {t(l.action)}{l.target ? <> · <span className="num">{l.target}</span></> : null}</span><span style={{ fontSize: 12, color: 'var(--faint)', whiteSpace: 'nowrap' }}>{t.ago(l.created_at)}</span></div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function count(xs: string[]) { const m = new Map<string, number>(); xs.forEach((x) => m.set(x, (m.get(x) || 0) + 1)); return [...m.entries()].sort((a, b) => b[1] - a[1]); }
function topOf(xs: string[]) { return count(xs)[0] || null; }

function Spark({ data }: { data: number[] }) {
  const max = Math.max(1, ...data), w = 84, h = 30;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * (h - 4) - 2}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="spark" aria-hidden>
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill="var(--accT)" stroke="none" />
      <polyline points={pts} fill="none" stroke="var(--acc)" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function Bars({ title, data }: { title: string; data: { l: string; v: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.v));
  return (
    <div className="card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <b style={{ fontSize: 15 }}>{title}</b>
      {data.map((d) => (
        <div key={d.l} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}><span>{d.l}</span><span className="num" style={{ color: 'var(--muted)' }}>{d.v}</span></span>
          <span className="pipe-bar"><span style={{ width: `${(d.v / max) * 100}%` }} /></span>
        </div>
      ))}
    </div>
  );
}
