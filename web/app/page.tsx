import Link from 'next/link';
import { SiteHeader, SiteFooter } from '@/components/Site';
import { ContactButton } from '@/components/ContactModal';
import { AnalysisDemo } from '@/components/landing/AnalysisDemo';
import { Icon } from '@/components/Icon';

function H2({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
      <span className="eyebrow">{eyebrow}</span>
      <h2 style={{ fontSize: 44, lineHeight: 1.25, maxWidth: 760 }}>{title}</h2>
      {sub && <p style={{ margin: 0, color: 'var(--muted)', fontSize: 18, maxWidth: 600, lineHeight: 1.8 }}>{sub}</p>}
    </div>
  );
}

const PREV: [string, string, string, string, string][] = [
  ['NAS-0175', 'وثائقي · ٨٨ د', '٨٫٧', 'تم التحليل', 'c-vio'], ['NAS-0178', 'تحريك · ١٤ د', '٩٫١', 'تمت المراجعة', 'c-ok'],
  ['NAS-0176', 'روائي · ٧٤ د', '٨٫٤', 'تم التحليل', 'c-vio'], ['NAS-0177', 'روائي · ٨١ د', '٧٫٩', 'عند المحكّم', 'c-info'],
];

function Preview() {
  return (
    <div className="wrap rise" style={{ marginTop: 80, animationDelay: '.24s' }}>
      <div style={{ maxWidth: 1040, margin: '0 auto', borderRadius: 22, border: '1px solid var(--line2)', background: 'var(--bg2)', overflow: 'hidden', boxShadow: '0 40px 120px -40px rgba(201,168,76,.22)' }}>
        <div style={{ height: 42, display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', borderBottom: '1px solid var(--line)' }}>
          {[0, 1, 2].map((i) => <span key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--s3)' }} />)}
          <span className="num" style={{ margin: '0 auto', fontSize: 12.5, color: 'var(--faint)', direction: 'ltr' }}>nas.sa/app/films</span>
        </div>
        <div className="g2" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(0, 1fr)' }}>
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10, borderInlineEnd: '1px solid var(--line)' }}>
            <div style={{ height: 44, borderRadius: 12, border: '1px solid var(--accL)', display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', color: 'var(--ink2)', fontSize: 14 }}>
              <span style={{ color: 'var(--acc)' }}><Icon name="search" size={16} /></span>وثائقي عن الأرض والعائلة
            </div>
            {PREV.map(([c, m, v, s, sc], i) => (
              <div key={c} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 12, background: i === 0 ? 'var(--s2)' : undefined }}>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}><b className="num" style={{ fontSize: 13.5, direction: 'ltr', textAlign: 'end' }}>{c}</b><span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{m}</span></span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span className={`chip ${sc}`}>{s}</span><b className="num" style={{ fontSize: 15, color: 'var(--accHi)', minWidth: 28, textAlign: 'end' }}>{v}</b></span>
              </div>
            ))}
          </div>
          <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><b style={{ fontSize: 14.5 }}>تحليل الفيلم</b><span className="num" style={{ fontSize: 12, color: 'var(--faint)', direction: 'ltr' }}>NAS-0175</span></span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span className="ring" style={{ width: 78, height: 78, background: 'conic-gradient(var(--acc) 0 87%, var(--s3) 87% 100%)' }}><span style={{ width: 64, height: 64, background: 'var(--bg2)' }}><b className="num" style={{ fontSize: 22 }}>٨٫٧</b></span></span>
              <span style={{ fontSize: 13.5, color: 'var(--ink2)', lineHeight: 1.75 }}>ملخص واضح وموضوع نادر، ويناسب قسم الوثائقي.</span>
            </span>
            <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}><span className="chip c-ok">ملاءمة عالية</span><span className="chip c-mute">الأرض</span><span className="chip c-mute">العائلة</span></span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: 'var(--ink2)' }}>
              <span style={{ display: 'flex', gap: 8 }}><b style={{ color: 'var(--ok)' }}>✓</b>رابط المشاهدة يعمل</span>
              <span style={{ display: 'flex', gap: 8 }}><b style={{ color: 'var(--acc)' }}>!</b>ترجمة ناقصة في بعض المقاطع</span>
            </span>
            <span style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 10, background: 'var(--s2)', fontSize: 13 }}><span style={{ color: 'var(--muted)' }}>المحكّم المقترح</span><b>لينا</b></span>
          </div>
        </div>
      </div>
    </div>
  );
}

const WHO: [string, string, string[]][] = [
  ['صنّاع الأفلام', 'يقدّمون أفلامهم في دقائق.', ['نموذج واحد واضح', 'فحص تلقائي قبل الإرسال', 'رقم مرجعي لمتابعة الحالة']],
  ['فريق المهرجان', 'يرى كل المشاركات في مكان واحد.', ['تحليل جاهز لكل فيلم', 'توزيع على المحكّمين بنقرة', 'قرارات وإشعارات بالبريد']],
  ['لجنة التحكيم', 'تشاهد وتقيّم بلا تعقيد.', ['كل محكّم يرى أفلامه فقط', 'تقييم بنقرات', 'ملاحظات تصل للفريق فورًا']],
];
const FLOW: [string, string][] = [
  ['أنشئ مهرجانك', 'الأقسام والمواعيد والشروط، في دقائق.'], ['شارك رابط التقديم', 'صفحة جاهزة باسم مهرجانك.'],
  ['تصلك الأفلام محلّلة', 'كل مشاركة ومعها تحليلها الأولي.'], ['وزّعها على المحكّمين', 'يدويًا، أو بنقرة حسب الترشيح.'],
  ['يقيّم المحكّمون', 'كل محكّم يشاهد أفلامه ويرسل تقييمه.'], ['أعلن النتائج', 'يصل القرار لكل صانع فيلم بالبريد.'],
];
const VALUES: [string, string][] = [['الوضوح', 'كل خطوة مفهومة لكل من يستخدم المنصة.'], ['الخصوصية', 'الأفلام لا يراها إلا من يحق له.'], ['الإنصاف', 'التحليل يساعد، والقرار للجنة.'], ['العربية أولًا', 'بُنيت بالعربية، لا مترجمة إليها.']];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <section style={{ background: 'var(--glow) top / 100% 760px no-repeat' }}>
        <div className="wrap" style={{ paddingTop: 136, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 26 }}>
          <h1 className="hh rise" style={{ fontSize: 76, lineHeight: 1.15, maxWidth: 900 }}>مهرجانك كلّه،<br /><span style={{ color: 'var(--acc)' }}>في مكان واحد.</span></h1>
          <p className="rise" style={{ margin: 0, maxWidth: 580, color: 'var(--muted)', fontSize: 20, lineHeight: 1.8, animationDelay: '.08s' }}>استقبل الأفلام، ووزّعها على لجنة التحكيم، واتخذ قرارك وأمامك تحليل واضح لكل فيلم.</p>
          <div className="rise" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4, animationDelay: '.16s' }}>
            <Link href="/login?mode=signup" className="btn btn-p btn-lg">ابدأ مع NAS</Link>
            <a href="#insight" className="btn btn-s btn-lg">جرّب تحليل الأفلام</a>
          </div>
        </div>
        <Preview />
      </section>

      <section id="features" className="wrap" style={{ paddingTop: 150 }}>
        <H2 eyebrow="المنصة" title="لكل شخص في المهرجان، مساحته." />
        <div className="g3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14, marginTop: 48 }}>
          {WHO.map(([e, t, items]) => (
            <div key={e} className="card" style={{ padding: 30, display: 'flex', flexDirection: 'column', gap: 16, borderRadius: 24 }}>
              <span className="eyebrow">{e}</span><h3 style={{ fontSize: 24, lineHeight: 1.35 }}>{t}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 6 }}>
                {items.map((i) => <span key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 15, color: 'var(--ink2)' }}><span style={{ color: 'var(--acc)' }}><Icon name="check" size={15} stroke={2.4} /></span>{i}</span>)}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="insight" style={{ paddingTop: 150 }}>
        <div className="wrap">
          <H2 eyebrow="تحليل الأفلام" title="تحليل لكل فيلم، خلال ثوانٍ من وصوله." sub="يقرأ NAS ملخص الفيلم وبياناته، ويعطيك تقييمًا أوليًا، والقسم الأنسب له، وما يستحق انتباه لجنتك. جرّبه بنفسك." />
          <AnalysisDemo />
        </div>
      </section>

      <section id="how" className="wrap" style={{ paddingTop: 150 }}>
        <H2 eyebrow="كيف تعمل" title="من الإطلاق إلى النتائج، بخطوات واضحة." />
        <div className="g3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1, marginTop: 48, background: 'var(--line)', border: '1px solid var(--line)', borderRadius: 24, overflow: 'hidden' }}>
          {FLOW.map(([t, p], i) => (
            <div key={t} style={{ padding: '30px 28px', background: 'var(--bg)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span className="num" style={{ fontSize: 15, fontWeight: 600, color: 'var(--acc)' }}>{'٠' + '١٢٣٤٥٦'[i]}</span><b style={{ fontSize: 18 }}>{t}</b>
              <span style={{ fontSize: 14.5, color: 'var(--muted)', lineHeight: 1.75 }}>{p}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="about" className="wrap" style={{ paddingTop: 150, paddingBottom: 140 }}>
        <div className="g2" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 56, alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <span className="eyebrow">من نحن</span>
            <h2 style={{ fontSize: 40, lineHeight: 1.35 }}>صُنعت في السعودية، للمهرجانات العربية.</h2>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: 17, lineHeight: 1.9 }}>NAS منصة لإدارة المهرجانات السينمائية. نؤمن أن الفيلم الجيد يستحق طريقًا واضحًا إلى جمهوره، وأن لجان التحكيم تستحق أدوات تحترم وقتها.</p>
            <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
              <ContactButton className="btn btn-p">تواصل معنا</ContactButton>
              <Link href="/apply" className="btn btn-s">أنا صانع أفلام</Link>
            </div>
          </div>
          <div className="g2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            {VALUES.map(([t, p]) => <div key={t} className="card" style={{ padding: 24, borderRadius: 20, display: 'flex', flexDirection: 'column', gap: 8 }}><b style={{ fontSize: 16 }}>{t}</b><span style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7 }}>{p}</span></div>)}
          </div>
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
