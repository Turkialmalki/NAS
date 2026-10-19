import Link from 'next/link';
import { getT } from '@/lib/i18n/server';
import type { T } from '@/lib/i18n/core';
import { AUDIENCES } from '@/lib/features';
import { SiteHeader, SiteFooter } from '@/components/Site';
import { Icon } from '@/components/Icon';

export async function generateMetadata() { const t = await getT(); return { title: t('المزايا') }; }

/** Small, honest illustrations of each feature, drawn with plain elements. */
function Art({ id, t }: { id: string; t: T }) {
  switch (id) {
    case 'command': return (
      <div className="fa fa-kpi">
        {[['المشاركات', '128', '+14'], ['تنتظر قرارك', '9', ''], ['تقدّم التحكيم', '72%', '']].map(([l, v, d]) => (
          <div key={l}><span>{t(l)}</span><b className="num">{v}</b>{d && <em className="num">{d}</em>}</div>
        ))}
        <svg viewBox="0 0 300 60" className="fa-spark" aria-hidden="true"><polyline points="0,50 25,44 50,46 75,36 100,38 125,30 150,33 175,22 200,25 225,15 250,18 275,8 300,10" fill="none" stroke="var(--acc)" strokeWidth="2.5" strokeLinejoin="round" /></svg>
      </div>);
    case 'ai-search': return (
      <div className="fa fa-q">
        <div className="mock-q"><Icon name="spark" size={16} style={{ color: 'var(--acc)' }} />{t('وثائقيات أقل من 30 دقيقة بدون محكّم')}</div>
        <span className="fa-chips"><span className="chip c-acc">{t('وثائقي')}</span><span className="chip c-acc">{t('أقل من {n} دقيقة', { n: 30 })}</span><span className="chip c-acc">{t('بدون محكّم')}</span></span>
        {[0, 1, 2].map((i) => <span key={i} className="fa-row"><span style={{ width: `${60 - i * 12}%` }} /><b className="num">{['8.7', '8.4', '7.9'][i]}</b></span>)}
      </div>);
    case 'programme': return (
      <div className="fa fa-tl">
        {[[8, 22, 40, 18], [30, 26, 66, 20], [14, 30, 52, 30]].map((r, i) => (
          <div key={i}><span className="lbl2">{t(['القاعة الكبرى', 'القاعة 2', 'القاعة 3'][i])}</span><span className="track"><i style={{ insetInlineStart: `${r[0]}%`, width: `${r[1]}%` }} /><i style={{ insetInlineStart: `${r[2]}%`, width: `${r[3]}%` }} /></span></div>
        ))}
      </div>);
    case 'vision': return (
      <div className="fa fa-vread">
        {[['الإيقاع', 'هادئ ومتدرّج', 62], ['الإضاءة', 'طبيعية نهارية', 78], ['الصوت', 'حوار واضح', 88], ['المشاهد', '42 مشهدًا', 100]].map(([k, v, w]) => (
          <span key={k as string}><span className="muted">{t(k as string)}</span><span className="pipe-bar"><span style={{ width: `${w}%` }} /></span><b>{t(v as string)}</b></span>
        ))}
        <span className="fa-chips"><span className="chip c-acc">{t('روائي')}</span><span className="chip c-ok">{t('يناسب قسم الروائي الطويل')}</span></span>
      </div>);
    case 'match': return (
      <div className="fa fa-match">
        {[['مهرجان للأفلام القصيرة', 94], ['ملتقى للوثائقي', 81], ['مهرجان سينمائي دولي', 62]].map(([n, p]) => (
          <span key={n as string}><b>{t(n as string)}</b><span className="match num">{t('{n}% تطابق', { n: p as number })}</span></span>
        ))}
      </div>);
    case 'jury': case 'desk': return (
      <div className="fa fa-jury">
        {[[5, 6], [3, 6], [6, 6]].map(([d, n], i) => (
          <span key={i}><span className="av" style={{ margin: 0 }}>{['م', 'ع', 'س'][i]}</span><span className="pipe-bar" style={{ flex: 1 }}><span style={{ width: `${(d / n) * 100}%`, background: d === n ? 'var(--ok)' : undefined }} /></span><b className="num">{d}/{n}</b></span>
        ))}
      </div>);
    case 'scoring': return (
      <div className="fa fa-score">
        {['القصة', 'الإخراج', 'الصورة والصوت'].map((c, i) => (
          <span key={c}><b>{t(c)}</b><span className="dots">{[1, 2, 3, 4, 5].map((n) => <i key={n} className={n <= [4, 5, 3][i] ? 'on' : ''} />)}</span></span>
        ))}
      </div>);
    case 'from-file': return (
      <div className="fa fa-file">
        <span className="doc"><Icon name="clip" size={22} /><b>festival-brochure.pdf</b></span>
        <Icon name="arrow" size={18} className="fwd" style={{ color: 'var(--faint)' }} />
        <span className="out">{['الاسم', 'المواعيد', 'الأقسام', 'الشروط'].map((x) => <span key={x}><Icon name="check" size={13} stroke={2.6} />{t(x)}</span>)}</span>
      </div>);
    case 'submit': case 'track': return (
      <div className="fa fa-track">
        {['أُرسلت', 'قيد المراجعة', 'اختير ✦'].map((s, i) => <span key={s} className={i < 2 ? 'done' : 'win'}><i />{t(s)}</span>)}
      </div>);
    default: return <div className="fa" />;
  }
}

export default async function Features() {
  const t = await getT();
  return (
    <>
      <SiteHeader />
      <main>
        <section className="wrap ft-hero">
          <h1 className="display">{t('كل ما يحتاجه مهرجانك، ولا شيء زائد.')}</h1>
          <p>{t('NAS يجمع المهرجان وصنّاع الأفلام ولجنة التحكيم في منصة واحدة، ولكل طرف مساحته.')}</p>
          <div className="seg ft-tabs">{AUDIENCES.map((a) => <a key={a.id} href={`#${a.id}`}>{t(a.label)}</a>)}</div>
        </section>
        {AUDIENCES.map((a) => (
          <section key={a.id} id={a.id} className="wrap ft-aud">
            <div className="ft-aud-h">
              <span className="eyebrow">{t(a.label)}</span>
              <h2 className="display">{t(a.title)}</h2>
              <p>{t(a.sub)}</p>
              <Link href={a.href} className="btn btn-p">{t(a.cta)}</Link>
            </div>
            <div className="ft-list">
              {a.features.map((f) => (
                <article key={f.id} id={`${a.id}-${f.id}`} className="ft-row">
                  <div className="ft-copy">
                    <span className="sn-ic"><Icon name={f.icon} size={17} /></span>
                    <h3>{t(f.title)}</h3>
                    <p>{t(f.body)}</p>
                    <ul>{f.points.map((p) => <li key={p}><Icon name="check" size={14} stroke={2.6} />{t(p)}</li>)}</ul>
                  </div>
                  <div className="ft-art"><Art id={f.id} t={t} /></div>
                </article>
              ))}
            </div>
          </section>
        ))}
        <section className="wrap ft-end">
          <h2 className="display">{t('ابدأ اليوم، مجانًا.')}</h2>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link href="/login?mode=signup" className="btn btn-p btn-lg">{t('أنشئ حسابك')}</Link>
            <Link href="/pricing" className="btn btn-s btn-lg">{t('الأسعار')}</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
