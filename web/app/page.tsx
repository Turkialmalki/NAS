import Link from 'next/link';
import { getT } from '@/lib/i18n/server';
import { SiteHeader, SiteFooter } from '@/components/Site';
import { ContactButton } from '@/components/ContactModal';
import { AnalysisDemo } from '@/components/landing/AnalysisDemo';
import { HeroScene, HowItWorks, RoleScenes } from '@/components/landing/Story';
import { Icon } from '@/components/Icon';

function Head({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="lp-head">
      <h2 className="display">{title}</h2>
      {sub && <p>{sub}</p>}
    </div>
  );
}

const WHY: [string, string, string][] = [
  ['globe', 'عربي أولًا', 'صُمّمت المنصة بالعربية من البداية، مع واجهة إنجليزية كاملة لمن يحتاجها.'],
  ['lock', 'خصوصية الأفلام', 'نسخ المشاهدة لا يراها إلا فريق المهرجان والمحكّمون المسندة إليهم.'],
  ['shield', 'القرار للجنة', 'التحليل يساعد في الفرز، والقرار النهائي دائمًا للجنة التحكيم.'],
  ['spark', 'بلا تدريب', 'كل شاشة تشرح نفسها، ويبدأ فريقك العمل من أول يوم.'],
  ['film', 'مجاني لصنّاع الأفلام', 'يضيف صانع الفيلم أفلامه ويقدّم للمهرجانات بلا رسوم من NAS.'],
  ['phone', 'يعمل على الجوال', 'تابع المشاركات والتقييمات من جوالك أينما كنت.'],
];

export default async function Home() {
  const t = await getT();
  return (
    <>
      <SiteHeader />
      <main>
        <section className="lp-hero">
          <div className="wrap lp-hero-in">
            <h1 className="display rise">{t('أدِر مهرجانك السينمائي من مكان واحد.')}</h1>
            <p className="rise" style={{ animationDelay: '.08s' }}>{t('من استقبال الأفلام وتحليلها إلى التحكيم ونشر جدول العروض، في منصة واحدة بالعربية والإنجليزية.')}</p>
            <div className="lp-ctas rise" style={{ animationDelay: '.14s' }}>
              <Link href="/login?mode=signup" className="btn btn-p btn-lg">{t('ابدأ مجانًا')}</Link>
              <a href="#how" className="btn btn-s btn-lg">{t('شاهد كيف يعمل')}</a>
            </div>
          </div>
          <div className="wrap rise" style={{ animationDelay: '.22s' }}><HeroScene /></div>
        </section>

        <section id="how" className="wrap lp-sec">
          <Head title={t('كيف يعمل NAS')} sub={t('أربع خطوات تغطي دورة المهرجان كاملة.')} />
          <HowItWorks />
        </section>

        <section id="roles" className="wrap lp-sec">
          <Head title={t('لكل مستخدم لوحة تحكم تناسبه.')} sub={t('المنظّم وصانع الفيلم والمحكّم، كلٌّ يرى ما يخصه فقط.')} />
          <RoleScenes />
        </section>

        <section id="insight" className="wrap lp-sec">
          <Head title={t('جرّب NAS Vision بنفسك')} sub={t('اختر فيلمًا تجريبيًا وشاهد كيف يحلّل NAS ملخصه ويقترح القسم والمحكّم المناسبين.')} />
          <AnalysisDemo />
        </section>

        <section id="about" className="wrap lp-sec">
          <Head title={t('لماذا NAS؟')} />
          <div className="lp-why">
            {WHY.map(([ic, h, p]) => (
              <div key={h}><span className="sn-ic"><Icon name={ic} size={17} /></span><b>{t(h)}</b><span>{t(p)}</span></div>
            ))}
          </div>
        </section>

        <section className="wrap lp-end">
          <h2 className="display">{t('دورتك القادمة تبدأ من هنا.')}</h2>
          <p>{t('أنشئ مهرجانك مجانًا، أو أضف فيلمك وقدّمه للمهرجانات.')}</p>
          <div className="lp-ctas">
            <Link href="/login?mode=signup&role=festival" className="btn btn-p btn-lg">{t('أنشئ مهرجانك')}</Link>
            <Link href="/login?mode=signup&role=filmmaker" className="btn btn-s btn-lg">{t('أنا صانع أفلام')}</Link>
            <ContactButton className="btn btn-g btn-lg">{t('تواصل معنا')}</ContactButton>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
