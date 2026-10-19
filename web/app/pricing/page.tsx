import Link from 'next/link';
import { getT } from '@/lib/i18n/server';
import { SiteHeader, SiteFooter } from '@/components/Site';
import { ContactButton } from '@/components/ContactModal';
import { Icon } from '@/components/Icon';

export async function generateMetadata() { const t = await getT(); return { title: t('الأسعار') }; }

// Plans. Prices are per festival edition (one round of submissions → results).
const PLANS = [
  { id: 'start', name: 'الانطلاق', price: 'مجانًا', per: 'لكل دورة', note: 'لمهرجان يبدأ أول دورة له.', cta: 'ابدأ مجانًا', href: '/login?mode=signup&role=festival',
    items: ['حتى 50 مشاركة في الدورة', 'حتى 3 محكّمين', 'صفحة تقديم باسم مهرجانك', 'فحص الجاهزية لكل فيلم', 'إشعارات بالبريد'] },
  { id: 'pro', name: 'احترافي', price: '1,900', cur: 'ر.س', per: 'لكل دورة', note: 'كل ما يحتاجه مهرجان متوسط أو كبير.', cta: 'ابدأ بالاحترافي', href: '/login?mode=signup&role=festival', top: true,
    items: ['مشاركات ومحكّمون بلا حد', 'NAS Vision بالذكاء الاصطناعي لكل فيلم', 'البحث بالذكاء الاصطناعي', 'إنشاء المهرجان من ملف', 'جدول العروض وصفحته العامة', 'تقارير وتصدير CSV'] },
  { id: 'org', name: 'المؤسسات', price: 'حسب الاتفاق', per: '', note: 'لجهات تدير أكثر من مهرجان.', cta: 'تواصل معنا', contact: true,
    items: ['كل مزايا الاحترافي', 'عدة مهرجانات ودورات', 'نطاق خاص لصفحات التقديم', 'تهيئة وتدريب للفريق', 'فوترة سنوية ودعم مخصص'] },
];
const FAQ: [string, string][] = [
  ['هل NAS مجاني لصنّاع الأفلام؟', 'نعم، دائمًا. تضيف أفلامك وتحلّلها بـ NAS Vision وتقدّم للمهرجانات بلا رسوم من NAS. بعض المهرجانات تضع رسوم تقديم خاصة بها.'],
  ['ماذا تعني «لكل دورة»؟', 'الدورة هي نسخة واحدة من مهرجانك: من فتح التقديم إلى إعلان النتائج. تدفع مرة واحدة للدورة، لا اشتراكًا شهريًا.'],
  ['هل أستطيع البدء مجانًا ثم الترقية؟', 'نعم. ابدأ بخطة الانطلاق، وعند الحاجة ترقّى للاحترافي في أي وقت، وتبقى كل بياناتك كما هي.'],
  ['هل يدفع المحكّمون شيئًا؟', 'لا. المحكّمون يدخلون بدعوة من المهرجان ولا يدفعون شيئًا.'],
];

export default async function Pricing() {
  const t = await getT();
  return (
    <>
      <SiteHeader />
      <main>
        <section className="wrap ft-hero" style={{ paddingBottom: 10 }}>
          <h1 className="display">{t('أسعار واضحة لكل دورة.')}</h1>
          <p>{t('مجاني لصنّاع الأفلام والمحكّمين. والمهرجانات تدفع لكل دورة، بلا اشتراك شهري.')}</p>
        </section>
        <section className="wrap pr-grid">
          {PLANS.map((p) => (
            <div key={p.id} className={`pr-card ${p.top ? 'top' : ''}`}>
              {p.top && <span className="pr-badge">{t('الأكثر اختيارًا')}</span>}
              <b className="pr-name">{t(p.name)}</b>
              <span className="pr-price"><span className="num">{t(p.price)}</span>{p.cur && <small>{t(p.cur)}</small>}</span>
              <span className="pr-per">{p.per ? t(p.per) : ' '}</span>
              <span className="pr-note">{t(p.note)}</span>
              {p.contact ? <ContactButton className="btn btn-s" topic="pricing">{t(p.cta)}</ContactButton>
                : <Link href={p.href!} className={`btn ${p.top ? 'btn-p' : 'btn-s'}`}>{t(p.cta)}</Link>}
              <ul>{p.items.map((x) => <li key={x}><Icon name="check" size={15} stroke={2.6} />{t(x)}</li>)}</ul>
            </div>
          ))}
        </section>
        <section className="wrap pr-free">
          <div><b>{t('صنّاع الأفلام')}</b><span>{t('مجانًا دائمًا: أفلام بلا حد، وتحليل NAS Vision، وتقديم ومتابعة لكل المهرجانات.')}</span></div>
          <Link href="/login?mode=signup&role=filmmaker" className="btn btn-q">{t('أضف فيلمك مجانًا')}</Link>
        </section>
        <section className="wrap pr-faq">
          <h2 className="display">{t('أسئلة شائعة')}</h2>
          {FAQ.map(([q, a]) => <details key={q} className="sn-acc"><summary>{t(q)}<Icon name="plus" size={16} /></summary><p>{t(a)}</p></details>)}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
