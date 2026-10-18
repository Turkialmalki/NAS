import Link from 'next/link';
import { getT } from '@/lib/i18n/server';
import { SiteHeader, SiteFooter } from '@/components/Site';
import { ContactButton } from '@/components/ContactModal';
import { AnalysisDemo } from '@/components/landing/AnalysisDemo';
import { Icon } from '@/components/Icon';
import type { T } from '@/lib/i18n/core';

function H2({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
      <span className="eyebrow">{eyebrow}</span>
      <h2 style={{ fontSize: 44, lineHeight: 1.25, maxWidth: 760 }}>{title}</h2>
      {sub && <p style={{ margin: 0, color: 'var(--muted)', fontSize: 18, maxWidth: 620, lineHeight: 1.8 }}>{sub}</p>}
    </div>
  );
}

const PREV: [string, string, number, string, string, string][] = [
  ['NAS-0175', 'وثائقي', 24, '8.7', 'تم التحليل', 'c-vio'], ['NAS-0181', 'وثائقي', 18, '8.4', 'تم التحليل', 'c-vio'],
  ['NAS-0190', 'وثائقي', 12, '7.9', 'تم التحليل', 'c-vio'],
];

function Preview({ t }: { t: T }) {
  return (
    <div className="wrap rise" style={{ marginTop: 80, animationDelay: '.24s' }}>
      <div className="mock">
        <div className="mock-bar">
          {[0, 1, 2].map((i) => <span key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--s3)' }} />)}
          <span className="num" style={{ margin: '0 auto', fontSize: 12.5, color: 'var(--faint)', direction: 'ltr' }}>nasfestivals.com/app/films</span>
        </div>
        <div className="g2" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(0, 1fr)' }}>
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10, borderInlineEnd: '1px solid var(--line)' }}>
            <div className="mock-q"><span style={{ color: 'var(--acc)' }}><Icon name="spark" size={16} /></span>{t('وثائقيات أقل من ٣٠ دقيقة بدون محكّم')}</div>
            <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', fontSize: 12.5, color: 'var(--faint)' }}>
              {t('فهمت:')}<span className="chip c-acc">{t('وثائقي')}</span><span className="chip c-acc">{t('أقل من {n} دقيقة', { n: 30 })}</span><span className="chip c-acc">{t('بدون محكّم')}</span>
            </span>
            {PREV.map(([c, g, d, v, s, sc], i) => (
              <div key={c} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 12, background: i === 0 ? 'var(--s2)' : undefined }}>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}><b className="num" style={{ fontSize: 13.5, direction: 'ltr', textAlign: 'end' }}>{c}</b><span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{t(g)} · {t('{n} د', { n: d })}</span></span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span className={`chip ${sc}`}>{t(s)}</span><b className="num" style={{ fontSize: 15, color: 'var(--accHi)', minWidth: 28, textAlign: 'end' }}>{t.n(v)}</b></span>
              </div>
            ))}
          </div>
          <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><b style={{ fontSize: 14.5 }}>NAS Vision</b><span className="num" style={{ fontSize: 12, color: 'var(--faint)', direction: 'ltr' }}>NAS-0175</span></span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span className="ring" style={{ width: 78, height: 78, background: 'conic-gradient(var(--acc) 0 87%, var(--s3) 87% 100%)' }}><span style={{ width: 64, height: 64, background: 'var(--bg2)' }}><b className="num" style={{ fontSize: 22 }}>{t.n('8.7')}</b></span></span>
              <span style={{ fontSize: 13.5, color: 'var(--ink2)', lineHeight: 1.75 }}>{t('صورة متقنة وإيقاع هادئ، ويناسب قسم الوثائقي القصير.')}</span>
            </span>
            <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}><span className="chip c-ok">{t('ملاءمة عالية')}</span><span className="chip c-mute">{t('الذاكرة')}</span><span className="chip c-mute">{t('المكان')}</span></span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: 'var(--ink2)' }}>
              <span style={{ display: 'flex', gap: 8 }}><b style={{ color: 'var(--ok)' }}>✓</b>{t('رابط المشاهدة يعمل')}</span>
              <span style={{ display: 'flex', gap: 8 }}><b style={{ color: 'var(--acc)' }}>!</b>{t('الترجمة غير موجودة في بعض المشاهد')}</span>
            </span>
            <span style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 10, background: 'var(--s2)', fontSize: 13 }}><span style={{ color: 'var(--muted)' }}>{t('المحكّم المقترح')}</span><b>{t('متخصص في الوثائقي')}</b></span>
          </div>
        </div>
      </div>
    </div>
  );
}

const SIDES: { eyebrow: string; title: string; items: string[]; cta: string; href: string }[] = [
  { eyebrow: 'للمهرجانات', title: 'غرفة قيادة لمهرجانك.', cta: 'أنشئ مهرجانك', href: '/login?mode=signup',
    items: ['أنشئ المهرجان من ملف PDF أو عرض تقديمي', 'ابحث في الأفلام بكلامك: «وثائقيات بدون محكّم»', 'توزيع متوازن على لجنة التحكيم ومواعيد واضحة', 'جدول عروض مقترح بلا تعارضات، ينشر بنقرة'] },
  { eyebrow: 'لصنّاع الأفلام', title: 'ارفع فيلمك مرة، وقدّم لكل المهرجانات.', cta: 'اكتشف المهرجانات', href: '/festivals',
    items: ['NAS Vision يشاهد فيلمك ويجهّز ملفه كاملًا', 'مهرجانات مقترحة تناسب فيلمك، مع نسبة التطابق', 'تقديم بضغطة، والقسم الأنسب مختار لك', 'تابع كل مشاركة من الإرسال إلى النتيجة'] },
];
const WOW: [string, string, string][] = [
  ['spark', 'بحث بالذكاء الاصطناعي', 'اكتب ما تريد كما تقوله، ويفهمه NAS ويصفّي الأفلام أو المهرجانات فورًا.'],
  ['eye', 'NAS Vision', 'يشاهد الفيلم نفسه: الإيقاع والألوان والصوت والمشاهد، ويكتب ملخصه.'],
  ['cal', 'برنامج العروض', 'اقتراح جدول كامل للقاعات والأيام مع كشف التعارضات تلقائيًا.'],
  ['chart', 'غرفة القيادة', 'ما يحتاجك اليوم، ومسار الأفلام، وتقدّم اللجنة، في شاشة واحدة.'],
  ['bell', 'إشعارات فورية', 'كل مشاركة جديدة وكل تقييم وكل نتيجة تصل لصاحبها في لحظتها.'],
  ['globe', 'عربي وإنجليزي', 'المنصة كاملة باللغتين، ويختار كل مستخدم لغته.'],
];
const FLOW: [string, string][] = [
  ['أنشئ مهرجانك', 'ارفع ملف المهرجان، ويجهّز NAS الأقسام والمواعيد والشروط.'], ['شارك رابط التقديم', 'صفحة تقديم جاهزة باسم مهرجانك.'],
  ['تصلك الأفلام محلّلة', 'كل مشاركة ومعها تحليل NAS Vision.'], ['وزّعها على المحكّمين', 'توزيع مقترح حسب التخصص وحِمل كل محكّم.'],
  ['يقيّم المحكّمون', 'كل محكّم يشاهد أفلامه ويرسل تقييمه قبل الموعد.'], ['أعلن النتائج وانشر البرنامج', 'يصل القرار لكل صانع فيلم، ويظهر البرنامج للجمهور.'],
];
const VALUES: [string, string][] = [['الوضوح', 'كل خطوة مفهومة لكل من يستخدم المنصة.'], ['الخصوصية', 'الأفلام لا يراها إلا من يحق له.'], ['الإنصاف', 'التحليل يساعد، والقرار للجنة.'], ['العربية أولًا', 'بُنيت بالعربية، لا مترجمة إليها.']];

export default async function Home() {
  const t = await getT();
  return (
    <>
      <SiteHeader />
      <section style={{ background: 'var(--glow) top / 100% 760px no-repeat' }}>
        <div className="wrap" style={{ paddingTop: 136, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 26 }}>
          <span className="chip c-acc rise"><Icon name="spark" size={13} />{t('جديد: NAS Vision والبحث بالذكاء الاصطناعي')}</span>
          <h1 className="hh rise" style={{ fontSize: 76, lineHeight: 1.15, maxWidth: 900 }}>{t('مهرجانك كلّه،')}<br /><span style={{ color: 'var(--acc)' }}>{t('في مكان واحد.')}</span></h1>
          <p className="rise" style={{ margin: 0, maxWidth: 600, color: 'var(--muted)', fontSize: 20, lineHeight: 1.8, animationDelay: '.08s' }}>{t('استقبل الأفلام، ووزّعها على لجنة التحكيم، وابنِ برنامج العروض، وأمامك تحليل واضح لكل فيلم.')}</p>
          <div className="rise" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4, animationDelay: '.16s' }}>
            <Link href="/login?mode=signup" className="btn btn-p btn-lg">{t('ابدأ مع NAS')}</Link>
            <Link href="/festivals" className="btn btn-s btn-lg">{t('أنا صانع أفلام')}</Link>
          </div>
        </div>
        <Preview t={t} />
      </section>

      <section id="features" className="wrap" style={{ paddingTop: 150 }}>
        <H2 eyebrow={t('المنصة')} title={t('مساحة لكل طرف، مصمّمة له.')} />
        <div className="g2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14, marginTop: 48 }}>
          {SIDES.map((s, i) => (
            <div key={s.eyebrow} className={`card side-card ${i === 0 ? 'gold' : ''}`}>
              <span className="eyebrow">{t(s.eyebrow)}</span><h3 style={{ fontSize: 28, lineHeight: 1.35 }} className="display">{t(s.title)}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 4 }}>
                {s.items.map((x) => <span key={x} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 15.5, color: 'var(--ink2)', lineHeight: 1.6 }}><span style={{ color: 'var(--acc)', marginTop: 3 }}><Icon name="check" size={15} stroke={2.4} /></span>{t(x)}</span>)}
              </div>
              <Link href={s.href} className={`btn ${i === 0 ? 'btn-p' : 'btn-s'}`} style={{ alignSelf: 'flex-start', marginTop: 'auto' }}>{t(s.cta)}<Icon name="arrow" size={15} className="fwd" /></Link>
            </div>
          ))}
        </div>
      </section>

      <section id="insight" style={{ paddingTop: 150 }}>
        <div className="wrap">
          <H2 eyebrow="NAS Vision" title={t('تحليل لكل فيلم، خلال ثوانٍ من وصوله.')} sub={t('يقرأ NAS بيانات الفيلم وملخصه، ويعطيك تقييمًا أوليًا، والقسم الأنسب له، وما يستحق انتباه لجنتك. جرّبه بنفسك.')} />
          <AnalysisDemo />
        </div>
      </section>

      <section className="wrap" style={{ paddingTop: 150 }}>
        <H2 eyebrow={t('ما يميّز NAS')} title={t('أدوات قليلة، كل واحدة تختصر عليك يومًا.')} />
        <div className="g3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14, marginTop: 48 }}>
          {WOW.map(([ic, h, p]) => (
            <div key={h} className="card wow">
              <span className="wow-ic"><Icon name={ic} size={20} /></span>
              <b style={{ fontSize: 18 }}>{t(h)}</b>
              <span style={{ fontSize: 14.5, color: 'var(--muted)', lineHeight: 1.75 }}>{t(p)}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="wrap" style={{ paddingTop: 150 }}>
        <H2 eyebrow={t('كيف تعمل')} title={t('من الإطلاق إلى النتائج، بخطوات واضحة.')} />
        <div className="g3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1, marginTop: 48, background: 'var(--line)', border: '1px solid var(--line)', borderRadius: 24, overflow: 'hidden' }}>
          {FLOW.map(([h, p], i) => (
            <div key={h} style={{ padding: '30px 28px', background: 'var(--bg)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span className="num" style={{ fontSize: 15, fontWeight: 600, color: 'var(--acc)' }}>{t.n(`0${i + 1}`)}</span><b style={{ fontSize: 18 }}>{t(h)}</b>
              <span style={{ fontSize: 14.5, color: 'var(--muted)', lineHeight: 1.75 }}>{t(p)}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="about" className="wrap" style={{ paddingTop: 150, paddingBottom: 140 }}>
        <div className="g2" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 56, alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <span className="eyebrow">{t('من نحن')}</span>
            <h2 style={{ fontSize: 40, lineHeight: 1.35 }}>{t('صُنعت في السعودية، للمهرجانات العربية.')}</h2>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: 17, lineHeight: 1.9 }}>{t('NAS منصة لإدارة المهرجانات السينمائية. نؤمن أن الفيلم الجيد يستحق طريقًا واضحًا إلى جمهوره، وأن لجان التحكيم تستحق أدوات تحترم وقتها.')}</p>
            <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
              <ContactButton className="btn btn-p">{t('تواصل معنا')}</ContactButton>
              <Link href="/festivals" className="btn btn-s">{t('اكتشف المهرجانات')}</Link>
            </div>
          </div>
          <div className="g2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            {VALUES.map(([h, p]) => <div key={h} className="card" style={{ padding: 24, borderRadius: 20, display: 'flex', flexDirection: 'column', gap: 8 }}><b style={{ fontSize: 16 }}>{t(h)}</b><span style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7 }}>{t(p)}</span></div>)}
          </div>
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
