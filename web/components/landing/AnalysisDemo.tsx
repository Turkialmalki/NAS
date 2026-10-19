'use client';

import { useT } from '@/components/Lang';
import { useEffect, useRef, useState } from 'react';
import { Icon, Spinner } from '../Icon';

type Sample = {
  t: string; m: string; syn: string; score: number; head: string; themes: string[]; tone: string[];
  fit: [string, number][]; checks: [boolean, string][]; pros: string[]; judge: string; why: string;
};

// real Saudi films (public synopses); the analysis shows what NAS reports for a submission
const SAMPLES: Sample[] = [
  { t: 'وجدة', m: 'روائي طويل · 98 دقيقة · 2012', syn: 'وجدة فتاة في العاشرة تعيش في الرياض، تحلم بشراء دراجة خضراء لتسابق صديقها عبدالله، فتشارك في مسابقة لتلاوة القرآن في مدرستها لتجمع ثمنها.',
    score: 8.8, head: 'حكاية واضحة بشخصية رئيسية قوية، ومناسبة لقسم الروائي الطويل.', themes: ['الطفولة', 'الطموح', 'المجتمع'], tone: ['دافئ', 'واقعي'],
    fit: [['الروائي الطويل', 95], ['الفيلم الأول', 88], ['الوثائقي', 6]], checks: [[true, 'رابط المشاهدة يعمل'], [true, 'المدة مطابقة لشروط القسم'], [true, 'ترجمة إنجليزية متوفرة']],
    pros: ['هدف واضح للشخصية منذ البداية.', 'تصوير قريب من الحياة اليومية في الرياض.'], judge: 'محكّم الروائي', why: 'تخصص روائي · فيلمان متبقيان' },
  { t: 'بركة يقابل بركة', m: 'روائي طويل · 88 دقيقة · 2016', syn: 'بركة موظف بلدية بسيط في جدة يقع في حب بيبي، المشهورة على إنستغرام، ويحاولان أن يلتقيا رغم القيود الاجتماعية في المدينة.',
    score: 8.3, head: 'كوميديا رومانسية بنبرة خفيفة، والملخص يوضح الصراع بسرعة.', themes: ['الحب', 'المدينة', 'المجتمع'], tone: ['ساخر', 'خفيف'],
    fit: [['الروائي الطويل', 91], ['الفيلم الأول', 40], ['الوثائقي', 4]], checks: [[true, 'رابط المشاهدة يعمل'], [true, 'المدة مطابقة لشروط القسم'], [false, 'الملخص لا يذكر الخاتمة']],
    pros: ['صراع واضح ومفهوم لجمهور واسع.', 'حضور قوي لمدينة جدة كمكان.'], judge: 'محكّم الروائي', why: 'كل الأقسام · 6 أفلام متبقية' },
  { t: 'سيدة البحر', m: 'روائي طويل · 75 دقيقة · 2019', syn: 'في قرية صيادين تقدّم كل عائلة إحدى بناتها لمخلوقات البحر، لكن حياة تنجو من هذا المصير وتشق طريقها بين رجال القرية.',
    score: 9.0, head: 'أسلوب بصري خاص وموضوع غير مألوف، ومرشّح قوي لقسم الروائي الطويل.', themes: ['التقاليد', 'البحر', 'الحرية'], tone: ['شاعري', 'غامض'],
    fit: [['الروائي الطويل', 93], ['الفيلم الأول', 84], ['الوثائقي', 3]], checks: [[true, 'رابط المشاهدة يعمل'], [true, 'المدة مطابقة لشروط القسم'], [true, 'لا توجد مشاركة مكررة']],
    pros: ['لغة بصرية نادرة في المشاركات.', 'فكرة أصيلة مستوحاة من البيئة المحلية.'], judge: 'محكّم الروائي', why: 'تخصص روائي · 4 أفلام متبقية' },
];
const STAGES = ['قراءة الملخص', 'استخراج الموضوعات', 'فحص الجاهزية', 'ترشيح المحكّم'];

export function AnalysisDemo() {
  const t = useT();
  const [si, setSi] = useState(0);
  const [stage, setStage] = useState(4);
  const tm = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(tm.current), []);
  const S = SAMPLES[si];
  const run = () => {
    if (stage < 4) return;
    setStage(0);
    const step = (n: number) => { tm.current = setTimeout(() => { setStage(n); if (n < 4) step(n + 1); }, 650); };
    step(1);
  };
  const pct = Math.round(S.score * 10);
  return (
    <div className="g2" style={{ display: 'grid', gridTemplateColumns: '360px minmax(0, 1fr)', gap: 16, marginTop: 52, alignItems: 'stretch' }}>
      <div className="card" style={{ padding: 24, borderRadius: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <b style={{ fontSize: 15 }}>{t('اختر فيلمًا تجريبيًا')}</b>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {SAMPLES.map((s, i) => (
            <button key={t(s.t)} type="button" aria-pressed={si === i} onClick={() => { clearTimeout(tm.current); setSi(i); setStage(4); }}
              className={`choice ${si === i ? 'on' : ''}`} style={{ background: si === i ? 'var(--accT)' : 'var(--bg2)', borderColor: si === i ? 'var(--accL)' : 'var(--line)' }}>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}><b style={{ fontSize: 14.5 }}>{t(s.t)}</b><span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{t(s.m)}</span></span>
            </button>
          ))}
        </div>
        <div style={{ padding: '14px 16px', borderRadius: 14, background: 'var(--s2)', fontSize: 14, color: 'var(--ink2)', lineHeight: 1.85 }}>«{t(S.syn)}»</div>
        <button type="button" className="btn btn-p" onClick={run} style={{ marginTop: 'auto' }}><Icon name="spark" size={16} />{stage < 4 ? t('جارٍ التحليل…') : t('حلّل الفيلم')}</button>
      </div>

      <div className="card" style={{ padding: 26, borderRadius: 24, display: 'flex', flexDirection: 'column', gap: 22, borderColor: 'var(--accL)', background: 'radial-gradient(600px 260px at 80% 0%, var(--accT), rgba(0,0,0,0) 70%), var(--s1)', minHeight: 520 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {STAGES.map((tx, i) => (
            <span key={tx} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 32, padding: '0 12px', borderRadius: 99, fontSize: 13,
              ...(i < stage ? { background: 'var(--s2)', color: 'var(--ink)' } : i === stage ? { background: 'var(--accT)', color: 'var(--accHi)' } : { border: '1px solid var(--line)', color: 'var(--faint)' }) }}>
              <span style={{ color: i < stage ? 'var(--ok)' : i === stage ? 'var(--acc)' : 'var(--faint)', fontWeight: 700 }}>{i < stage ? '✓' : i === stage ? '…' : '•'}</span>{t(tx)}
            </span>
          ))}
        </div>
        {stage < 4 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, color: 'var(--muted)' }}>
            <Spinner size={34} /><span style={{ fontSize: 15 }}>{STAGES[Math.min(stage, 3)]}…</span>
          </div>
        ) : (
          <div className="rise" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div style={{ display: 'flex', gap: 22, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="ring" style={{ width: 120, height: 120, background: `conic-gradient(var(--acc) 0 ${pct}%, var(--s3) ${pct}% 100%)` }}>
                <span style={{ width: 100, height: 100 }}><b className="num" style={{ fontSize: 34, lineHeight: 1 }}>{t.n(S.score.toFixed(1))}</b><span style={{ fontSize: 11.5, color: 'var(--faint)', marginTop: 5 }}>{t('التقييم الأولي')}</span></span>
              </span>
              <span style={{ flex: 1, minWidth: 240, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <b style={{ fontSize: 19, lineHeight: 1.5 }}>{t(S.head)}</b>
                <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{S.themes.map((tx) => <span key={tx} className="chip c-mute">{t(tx)}</span>)}{S.tone.map((tx) => <span key={tx} className="chip c-vio">{t(tx)}</span>)}</span>
              </span>
            </div>
            <div className="g2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
              <div style={{ padding: 18, borderRadius: 16, background: 'var(--s2)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <b style={{ fontSize: 14 }}>{t('القسم الأنسب')}</b>
                {S.fit.map(([l, v]) => (
                  <div key={l} style={{ display: 'grid', gridTemplateColumns: '110px minmax(0, 1fr) 40px', gap: 10, alignItems: 'center', fontSize: 13.5 }}>
                    <span style={{ color: 'var(--ink2)' }}>{t(l)}</span><span className="bar"><span style={{ width: `${v}%` }} /></span><b className="num" style={{ textAlign: 'end' }}>{t.n(v)}{t('%')}</b>
                  </div>
                ))}
              </div>
              <div style={{ padding: 18, borderRadius: 16, background: 'var(--s2)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <b style={{ fontSize: 14 }}>{t('فحص الجاهزية')}</b>
                {S.checks.map(([ok, tx]) => <span key={tx} style={{ display: 'flex', gap: 10, fontSize: 13.5, color: 'var(--ink2)' }}><b style={{ color: ok ? 'var(--ok)' : 'var(--acc)' }}>{ok ? '✓' : '!'}</b>{t(tx)}</span>)}
              </div>
            </div>
            <div className="g2" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 220px', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><b style={{ fontSize: 14 }}>{t('نقاط القوة')}</b>{S.pros.map((p) => <span key={p} style={{ fontSize: 14, color: 'var(--ink2)', lineHeight: 1.7 }}>• {t(p)}</span>)}</div>
              <div style={{ padding: 16, borderRadius: 16, border: '1px solid var(--line2)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{t('المحكّم المقترح')}</span><b style={{ fontSize: 16 }}>{t(S.judge)}</b><span style={{ fontSize: 12.5, color: 'var(--faint)' }}>{t(S.why)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
