'use client';
import { useEffect, useRef, useState } from 'react';
import { useT } from '../Lang';
import { Icon } from '../Icon';

/* Animated product scenes for the home page. Every scene is drawn from the real NAS screens
   (dashboard, NAS Vision, jury, screening schedule) so each section shows what the feature does. */

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function useTick(ms: number, max: number, run = true) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!run) return;
    if (reduced()) { setN(max - 1); return; }
    const id = setInterval(() => setN((x) => (x + 1) % max), ms);
    return () => clearInterval(id);
  }, [ms, max, run]);
  return n;
}

function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting), { threshold: 0.25 });
    io.observe(el); return () => io.disconnect();
  }, []);
  return [ref, on] as const;
}

function Count({ to, run, dec = 0 }: { to: number; run: boolean; dec?: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run) return;
    if (reduced()) { setV(to); return; }
    let raf = 0; const t0 = performance.now();
    const step = (t: number) => { const p = Math.min(1, (t - t0) / 1400); setV(to * (1 - Math.pow(1 - p, 3))); if (p < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf);
  }, [to, run]);
  return <>{dec ? v.toFixed(dec) : Math.round(v).toLocaleString('en-US')}</>;
}

const Chrome = ({ url, children }: { url: string; children: React.ReactNode }) => (
  <div className="sc-win">
    <div className="sc-bar"><i /><i /><i /><span dir="ltr">{url}</span></div>
    {children}
  </div>
);

/* ------------------------------------------------------------------ hero: the dashboard, live */
// real Saudi films, as they would appear when submitted
const ARRIVALS = [
  { title: 'وجدة', meta: 'روائي طويل · 2012' },
  { title: 'بركة يقابل بركة', meta: 'روائي طويل · 2016' },
  { title: 'سيدة البحر', meta: 'روائي طويل · 2019' },
  { title: 'حد الطار', meta: 'روائي طويل · 2020' },
];

export function HeroScene() {
  const t = useT();
  const [ref, on] = useInView<HTMLDivElement>();
  const tick = useTick(1500, 12, on);
  const shown = Math.min(ARRIVALS.length, Math.floor(tick / 2) + 1);
  return (
    <div ref={ref} className="sc-hero">
      <Chrome url="nasfestivals.com/app">
        <div className="sc-app">
          <aside className="sc-side">
            <span className="sc-fest"><b>{t('مهرجان الأفلام القصيرة').slice(0, 1)}</b>{t('مهرجان الأفلام القصيرة')}</span>
            {[['grid', 'لوحة التحكم'], ['film', 'الأفلام'], ['users', 'لجنة التحكيم'], ['cal', 'جدول العروض'], ['chart', 'التقارير']].map(([ic, l], i) => (
              <span key={l} className={`sc-nav ${i === 0 ? 'on' : ''}`}><Icon name={ic} size={14} />{t(l)}</span>
            ))}
          </aside>
          <div className="sc-main">
            <div className="sc-q"><Icon name="spark" size={14} /><span className="sc-type">{t('أفلام روائية طويلة بدون محكّم')}</span></div>
            <div className="sc-kpis">
              <div><span>{t('المشاركات')}</span><b className="num"><Count to={128 + shown} run={on} /></b><em className="num">+{12 + shown}</em></div>
              <div><span>{t('تنتظر قرارك')}</span><b className="num"><Count to={9} run={on} /></b></div>
              <div><span>{t('تقدّم التحكيم')}</span><b className="num"><Count to={72} run={on} />%</b></div>
            </div>
            <div className="sc-list">
              <span className="sc-h">{t('آخر المشاركات')}</span>
              {ARRIVALS.slice(0, shown).reverse().map((a, i) => {
                const fresh = i === 0 && tick % 2 === 0;
                return (
                  <div key={a.title} className={`sc-row ${i === 0 ? 'in' : ''}`}>
                    <span className="sc-rt"><b>{t(a.title)}</b><span>{t(a.meta)}</span></span>
                    {fresh ? <span className="chip c-info sc-chip"><span className="sc-dot" />{t('قيد التحليل')}</span>
                      : <span className="chip c-vio sc-chip"><Icon name="check" size={11} stroke={3} />{t('تم التحليل')}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Chrome>
    </div>
  );
}

/* ------------------------------------------------------------------ how it works: four scenes */
function CreateScene() {
  const t = useT();
  const rows: [string, string][] = [['اسم المهرجان', 'مهرجان الأفلام القصيرة'], ['آخر موعد للتقديم', '15 ديسمبر'], ['الأقسام', 'الروائي القصير · الوثائقي · التحريك'], ['معايير التحكيم', 'القصة 30% · الإخراج 25% · الصورة 20% · الأصالة 25%']];
  return (
    <div className="sc-stage sc-create">
      <div className="sc-file"><span className="sc-scan" /><Icon name="clip" size={26} /><b dir="ltr">festival-brochure.pdf</b><span>12 {t('صفحة')}</span></div>
      <div className="sc-out">
        {rows.map(([k, v], i) => (
          <div key={k} className="rv sc-field" style={{ ['--d' as string]: `${0.6 + i * 0.55}s` }}>
            <span className="sc-ok"><Icon name="check" size={12} stroke={3} /></span><span className="k">{t(k)}</span><b>{t(v)}</b>
          </div>
        ))}
        <div className="rv sc-ready" style={{ ['--d' as string]: '3s' }}><Icon name="globe" size={14} />{t('صفحة التقديم جاهزة')}<span dir="ltr">/f/short-films</span></div>
      </div>
    </div>
  );
}

function ReceiveScene() {
  const t = useT();
  const reads: [string, string, number][] = [['الإيقاع', 'هادئ ومتدرّج', 62], ['الإضاءة', 'طبيعية نهارية', 78], ['الصوت', 'حوار واضح', 88], ['المشاهد', '42 مشهدًا', 100]];
  return (
    <div className="sc-stage sc-receive">
      <div className="rv sc-sub" style={{ ['--d' as string]: '0.2s' }}>
        <span className="sc-film"><Icon name="film" size={20} /></span>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}><b>{t('وجدة')}</b><span className="muted">{t('روائي طويل · 2012')}</span></span>
        <span className="chip c-ok">{t('وصلت المشاركة')}</span>
      </div>
      <div className="sc-vision">
        <span className="sc-vh"><Icon name="eye" size={14} />{t('NAS Vision يحلّل الفيلم')}</span>
        <div className="sc-reads">
          {reads.map(([k, v, w], i) => (
            <div key={k} className="sc-read">
              <span className="k">{t(k)}</span>
              <span className="pipe-bar"><span className="sc-grow" style={{ ['--w' as string]: `${w}%`, ['--d' as string]: `${0.6 + i * 0.35}s` }} /></span>
              <span className="rv v" style={{ ['--d' as string]: `${0.9 + i * 0.35}s` }}>{t(v)}</span>
            </div>
          ))}
        </div>
        <span className="rv" style={{ ['--d' as string]: '2.4s', display: 'flex', gap: 6, flexWrap: 'wrap' }}><span className="chip c-acc">{t('روائي')}</span><span className="chip c-ok">{t('يناسب قسم الروائي الطويل')}</span></span>
        <span className="rv sc-check" style={{ ['--d' as string]: '2.8s' }}><Icon name="check" size={13} stroke={2.6} />{t('رابط المشاهدة يعمل')}</span>
      </div>
    </div>
  );
}

function JuryScene() {
  const t = useT();
  const jury: [string, string, number][] = [['س', 'تخصص وثائقي', 80], ['ع', 'تخصص روائي', 55], ['ن', 'تخصص تحريك', 100]];
  return (
    <div className="sc-stage sc-jury">
      <div className="sc-jl">
        {jury.map(([a, s, p], i) => (
          <div key={a} className="rv sc-juror" style={{ ['--d' as string]: `${0.2 + i * 0.3}s` }}>
            <span className="av" style={{ margin: 0 }}>{a}</span>
            <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}><span className="muted" style={{ fontSize: 12.5 }}>{t(s)}</span><span className="pipe-bar"><span className="sc-grow" style={{ ['--w' as string]: `${p}%`, ['--d' as string]: `${0.8 + i * 0.3}s`, background: p === 100 ? 'var(--ok)' : undefined }} /></span></span>
          </div>
        ))}
      </div>
      <div className="rv sc-score-card" style={{ ['--d' as string]: '1.2s' }}>
        <b>{t('سيدة البحر')}</b>
        {[['القصة', 4], ['الإخراج', 5], ['الصورة والصوت', 4]].map(([c, n], i) => (
          <span key={c as string} className="sc-crit"><span>{t(c as string)}</span><span className="dots">{[1, 2, 3, 4, 5].map((k) => <i key={k} className={k <= (n as number) ? 'on' : ''} style={{ ['--d' as string]: `${1.6 + i * 0.4 + k * 0.08}s` }} />)}</span></span>
        ))}
        <span className="rv sc-total" style={{ ['--d' as string]: '3.2s' }}><span>{t('تقييمك')}</span><b>{t('أُرسل ✓')}</b></span>
      </div>
    </div>
  );
}

function ProgrammeScene() {
  const t = useT();
  const blocks: [number, number, number, string][] = [[0, 6, 22, 'وجدة'], [0, 34, 28, 'بركة يقابل بركة'], [1, 10, 24, 'سيدة البحر'], [1, 42, 26, 'حد الطار'], [0, 68, 24, 'هجان']];
  return (
    <div className="sc-stage sc-prog">
      <div className="sc-days"><span className="on">{t('الخميس 5 نوفمبر')}</span><span>{t('الجمعة 6 نوفمبر')}</span></div>
      {['القاعة الكبرى', 'سينما البلد'].map((v, r) => (
        <div key={v} className="sc-lane"><span className="muted">{t(v)}</span>
          <span className="sc-track">{blocks.filter((b) => b[0] === r).map(([, x, w, n], i) => (
            <i key={n} className="rv sc-blk" style={{ insetInlineStart: `${x}%`, width: `${w}%`, ['--d' as string]: `${0.3 + (r * 2 + i) * 0.4}s` }}>{t(n)}</i>
          ))}</span>
        </div>
      ))}
      <div className="sc-pub"><span className="sc-switch rv-on" /><span className="rv" style={{ ['--d' as string]: '2.9s' }}>{t('نُشر جدول العروض على صفحة المهرجان')}</span></div>
    </div>
  );
}

const STEPS = [
  { k: 'create', title: 'أنشئ المهرجان', body: 'ارفع كتيّب المهرجان أو اكتب اسمه فقط، ويجهّز NAS الأقسام والمواعيد ومعايير التحكيم وصفحة التقديم.', Scene: CreateScene },
  { k: 'receive', title: 'استقبل الأفلام', body: 'كل فيلم يصل ومعه تحليل NAS Vision: التقييم الأولي، والقسم المناسب، وفحص رابط المشاهدة والمدة.', Scene: ReceiveScene },
  { k: 'jury', title: 'التحكيم', body: 'وزّع الأفلام على المحكّمين حسب التخصص، وتابع تقدّم كل محكّم، والتقييم يُحسب تلقائيًا بأوزان معاييرك.', Scene: JuryScene },
  { k: 'programme', title: 'جدول العروض', body: 'ضع الأفلام المقبولة على القاعات والأيام بلا تعارضات، وانشر الجدول للجمهور بضغطة.', Scene: ProgrammeScene },
];

export function HowItWorks() {
  const t = useT();
  const [ref, on] = useInView<HTMLDivElement>();
  const [i, setI] = useState(0);
  const [cycle, setCycle] = useState(0);
  useEffect(() => {
    if (!on || reduced()) return;
    const id = setTimeout(() => { setI((x) => (x + 1) % STEPS.length); setCycle((c) => c + 1); }, 6500);
    return () => clearTimeout(id);
  }, [i, on, cycle]);
  const S = STEPS[i];
  return (
    <div ref={ref} className="hw">
      <div className="hw-tabs" role="tablist">
        {STEPS.map((s, k) => (
          <button key={s.k} type="button" role="tab" aria-selected={k === i} className={k === i ? 'on' : ''} onClick={() => { setI(k); setCycle((c) => c + 1); }}>
            <span className="hw-n num">{k + 1}</span>
            <span className="hw-t"><b>{t(s.title)}</b><span>{t(s.body)}</span></span>
            {k === i && on && <span className="hw-prog" key={cycle} />}
          </button>
        ))}
      </div>
      <div className="hw-view"><Chrome url={`nasfestivals.com/app/${S.k === 'create' ? 'new' : S.k === 'receive' ? 'films' : S.k === 'jury' ? 'jury' : 'programme'}`}><div key={`${S.k}${cycle}`} className="hw-scene"><S.Scene /></div></Chrome></div>
    </div>
  );
}

/* ------------------------------------------------------------------ one home per role */
export function RoleScenes() {
  const t = useT();
  const [ref, on] = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className={`roles ${on ? 'go' : ''}`}>
      <div className="role">
        <div className="role-art">
          <div className="ra-kpi"><span>{t('المشاركات')}</span><b className="num"><Count to={136} run={on} /></b></div>
          <svg viewBox="0 0 200 60" className="ra-spark"><polyline points="0,52 20,48 40,50 60,40 80,42 100,30 120,34 140,22 160,24 180,12 200,14" /></svg>
          <div className="ra-todo"><i />{t('9 أفلام تنتظر قرارك')}</div>
        </div>
        <span className="eyebrow">{t('منظّم المهرجان')}</span>
        <h3>{t('لوحة تحكم واحدة لمهرجانك.')}</h3>
        <p>{t('مهام اليوم، ومراحل الأفلام، وتقدّم لجنة التحكيم، في شاشة واحدة.')}</p>
      </div>
      <div className="role">
        <div className="role-art">
          {[['مهرجان أفلام السعودية', 94], ['مهرجان البحر الأحمر السينمائي', 81], ['مهرجان الأفلام القصيرة', 62]].map(([n, p], i) => (
            <div key={n as string} className="ra-match"><span>{t(n as string)}</span><span className="ra-bar"><i style={{ ['--w' as string]: `${p}%`, transitionDelay: `${0.2 + i * 0.25}s` }} /></span><b className="num">{p}%</b></div>
          ))}
        </div>
        <span className="eyebrow">{t('صانع الأفلام')}</span>
        <h3>{t('ارفع فيلمك مرة، وقدّم لكل المهرجانات.')}</h3>
        <p>{t('مهرجانات مقترحة تناسب فيلمك، مع نسبة التطابق')}</p>
      </div>
      <div className="role">
        <div className="role-art">
          {['القصة', 'الإخراج', 'الصورة والصوت'].map((c, r) => (
            <div key={c} className="ra-crit"><span>{t(c)}</span><span className="dots">{[1, 2, 3, 4, 5].map((k) => <i key={k} className={k <= [4, 5, 3][r] ? 'on' : ''} style={{ transitionDelay: `${0.2 + r * 0.3 + k * 0.07}s` }} />)}</span></div>
          ))}
        </div>
        <span className="eyebrow">{t('المحكّم')}</span>
        <h3>{t('شاهد وقيّم، بلا تعقيد.')}</h3>
        <p>{t('كل محكّم يرى أفلامه فقط، ويقيّمها بمعايير المهرجان قبل الموعد.')}</p>
      </div>
    </div>
  );
}
