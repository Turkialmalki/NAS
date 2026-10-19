'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { aiFilter } from '@/app/actions/ai';
import { parseFestQuery, applyFestFilters, festChips, removeChip, type FestFilters } from '@/lib/nlFilter';
import { bestCategory, type RecFestival } from '@/lib/recommend';
import type { MyFilm } from '@/lib/me';
import { AiFilterBar } from '../app/AiFilterBar';
import { useT } from '../Lang';
import { Icon } from '../Icon';
import { SubmitDialog } from './SubmitDialog';

type Fest = RecFestival & { description: string | null; results_on: string | null; starts_on: string | null; films: number };
const EXAMPLES = ['مهرجانات أفلام قصيرة في السعودية', 'مهرجانات مجانية يغلق التقديم فيها هذا الشهر', 'مهرجانات للوثائقي'];
const QUICK: [string, FestFilters][] = [['الكل', {}], ['يغلق قريبًا', { closingDays: 14 }], ['مجاني', { free: true }], ['أفلام قصيرة', { type: 'قصير' }], ['وثائقي', { type: 'وثائق' }], ['في السعودية', { country: 'السعودية' }]];
const same = (a: FestFilters, b: FestFilters) => JSON.stringify(a) === JSON.stringify(b);
const daysTo = (d: string | null) => (d ? Math.ceil((new Date(d).getTime() - Date.now()) / 86400000) : null);
// a stable warm hue per festival so every cover looks different
const hue = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);

export function FestivalDiscovery({ festivals, films = [], initialAi = '', signedIn, variant = 'app' }: { festivals: Fest[]; films?: MyFilm[]; initialAi?: string; signedIn: boolean; variant?: 'app' | 'public' }) {
  const t = useT();
  const [ff, setFf] = useState<FestFilters>(() => (initialAi ? parseFestQuery(initialAi).f : {}));
  const [busy, setBusy] = useState(false);
  const [submit, setSubmit] = useState<string | null>(null);
  const list = useMemo(() => applyFestFilters(festivals, ff), [festivals, ff]);
  async function search(q: string) {
    if (!q.trim()) { setFf({}); return; }
    const local = parseFestQuery(q).f; setFf(local);
    if (local.text?.length) { setBusy(true); const r = await aiFilter(q, 'festivals').catch(() => null); if (r && Object.keys(r).length) setFf(r as FestFilters); setBusy(false); }
  }
  useEffect(() => { if (initialAi) search(initialAi); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const fit = (f: Fest) => {
    if (!films.length) return null;
    let best: { pct: number; film: string; cat: string | null } | null = null;
    for (const m of films) { const b = bestCategory({ id: m.id, title: m.title, genre: m.genre, duration_min: m.duration_min }, f); if (!best || b.pct > best.pct) best = { pct: b.pct, film: m.title, cat: b.name }; }
    return best;
  };
  const filtering = Object.keys(ff).length > 0;
  const [first, ...rest] = list;
  const showFeatured = !filtering && list.length >= 3;

  const Cta = ({ f, big = false }: { f: Fest; big?: boolean }) => (
    <span style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 6 }}>
      {signedIn
        ? <button type="button" className={`btn btn-p ${big ? '' : 'btn-sm'}`} style={{ flex: big ? undefined : 1 }} onClick={() => setSubmit(f.id)}>{t('قدّم فيلمك')}</button>
        : <Link href="/login?mode=signup&role=filmmaker" className={`btn btn-p ${big ? '' : 'btn-sm'}`} style={{ flex: big ? undefined : 1 }}>{t('قدّم فيلمك')}</Link>}
      <Link href={`/f/${f.slug}`} className={`btn btn-s ${big ? '' : 'btn-sm'}`}>{t('التفاصيل')}</Link>
    </span>
  );
  const Meta = ({ f }: { f: Fest }) => (
    <span className="fd-meta">
      {(f.city || f.country) && <span><Icon name="globe" size={13} />{[f.city, f.country && t(f.country)].filter(Boolean).join(t('، '))}</span>}
      <span><Icon name="cal" size={13} />{f.submissions_close ? t('آخر موعد {d}', { d: t.dateShort(f.submissions_close) }) : t('التقديم مفتوح')}</span>
      {f.fee_note && <span><Icon name="key" size={13} />{t(f.fee_note)}</span>}
    </span>
  );
  const Cover = ({ f, h }: { f: Fest; h: number }) => {
    const d = daysTo(f.submissions_close);
    return (
      <div className="fd-cover" style={{ height: h, ['--h' as string]: hue(f.name) }}>
        <span className="display fd-mono" dir="auto">{f.name.trim().slice(0, 1)}</span>
        {d != null && d <= 14 && <span className="fd-soon">{d <= 0 ? t('يغلق اليوم') : t('يغلق بعد {n} يومًا', { n: d })}</span>}
      </div>
    );
  };

  return (
    <>
      <div className={`fd-head ${variant === 'public' ? 'pub' : ''}`}>
        <h1 className={variant === 'public' ? 'display' : ''}>{variant === 'public' ? t('مهرجانات تستقبل أفلامك الآن') : t('اكتشف المهرجانات')}</h1>
        <p>{variant === 'public' ? t('ابحث بكلماتك، وقارن المواعيد والأقسام والرسوم، وقدّم من ملف فيلمك بضغطة.') : t('مهرجانات تستقبل الأفلام الآن. اكتب ما تبحث عنه بكلماتك.')}</p>
      </div>

      {festivals.length === 0 ? (
        <div className="fd-empty">
          <h2 className="display">{t('لا توجد مهرجانات مفتوحة للتقديم حاليًا')}</h2>
          <p>{t('تظهر المهرجانات هنا فور فتح التقديم فيها، مع أقسامها ومواعيدها ورسومها.')}</p>
          <div className="fd-empty-ctas">
            <Link href={signedIn ? '/app/me/films/new' : '/login?mode=signup&role=filmmaker'} className="btn btn-p">{t('جهّز ملف فيلمك الآن')}</Link>
            <Link href={signedIn ? '/app/new' : '/login?mode=signup&role=festival'} className="btn btn-s">{t('أدرج مهرجانك')}</Link>
          </div>
        </div>
      ) : <>
        <AiFilterBar initial={initialAi} chips={festChips(ff)} busy={busy} count={list.length} total={festivals.length} examples={EXAMPLES}
          onQuery={search} onRemove={(k) => setFf((p) => removeChip(p, k))} onClear={() => setFf({})} />
        <div className="fd-quick" role="toolbar" aria-label={t('تصفية سريعة')}>
          {QUICK.map(([l, v]) => <button key={l} type="button" className={same(ff, v) ? 'on' : ''} aria-pressed={same(ff, v)} onClick={() => setFf(v)}>{t(l)}</button>)}
        </div>

        {list.length === 0 ? (
          <div className="card empty">{t('لا توجد مهرجانات بهذا الوصف. جرّب وصفًا أوسع.')} <button type="button" className="link" style={{ background: 'none', border: 0, font: 'inherit', cursor: 'pointer' }} onClick={() => setFf({})}>{t('اعرض الكل')}</button></div>
        ) : <>
          {showFeatured && first && (
            <article className="fd-feat">
              <Cover f={first} h={300} />
              <div className="fd-feat-body">
                <span className="eyebrow">{daysTo(first.submissions_close) != null ? t('أقرب موعد إغلاق') : t('مفتوح للتقديم')}</span>
                <h2 dir="auto">{first.name}</h2>
                <Meta f={first} />
                {first.description && <p dir="auto">{first.description}</p>}
                <span className="fd-cats">{first.categories.slice(0, 5).map((c) => <span key={c.id} className="chip c-mute">{c.name}</span>)}</span>
                <Cta f={first} big />
              </div>
            </article>
          )}
          <div className="fd-grid">
            {(showFeatured ? rest : list).map((f) => {
              const m = fit(f);
              return (
                <article key={f.id} className="fd-card">
                  <Cover f={f} h={120} />
                  <div className="fd-body">
                    <span style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                      <b className="fd-name" dir="auto">{f.name}</b>
                      {m && m.pct >= 50 && <span className="match num">{t('{n}% تطابق', { n: m.pct })}</span>}
                    </span>
                    <Meta f={f} />
                    {f.description && <span className="fd-desc" dir="auto">{f.description}</span>}
                    <span className="fd-cats">{f.categories.slice(0, 3).map((c) => <span key={c.id} className="chip c-mute">{c.name}</span>)}</span>
                    {m && m.pct >= 50 && m.cat && <span style={{ fontSize: 12.5, color: 'var(--accHi)' }}>✦ {t('«{f}» يناسب قسم {c}', { f: m.film, c: m.cat })}</span>}
                    <Cta f={f} />
                  </div>
                </article>
              );
            })}
          </div>
        </>}
      </>}
      {variant === 'public' && festivals.length > 0 && (
        <div className="fd-list-own"><span>{t('تنظّم مهرجانًا؟ اعرضه هنا لصنّاع الأفلام.')}</span><Link href="/login?mode=signup&role=festival" className="link">{t('أدرج مهرجانك')}</Link></div>
      )}
      {submit && <SubmitDialog films={films} festivals={festivals} festivalId={submit} onClose={() => setSubmit(null)} />}
    </>
  );
}
