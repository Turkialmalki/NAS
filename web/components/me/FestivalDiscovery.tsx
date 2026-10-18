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

export function FestivalDiscovery({ festivals, films = [], initialAi = '', signedIn }: { festivals: Fest[]; films?: MyFilm[]; initialAi?: string; signedIn: boolean }) {
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

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h1 style={{ fontSize: 34 }}>{t('اكتشف المهرجانات')}</h1>
        <span style={{ color: 'var(--muted)', fontSize: 15.5 }}>{t('مهرجانات تستقبل الأفلام الآن. اكتب ما تبحث عنه بكلامك.')}</span>
      </div>
      <AiFilterBar initial={initialAi} chips={festChips(ff)} busy={busy} count={list.length} total={festivals.length} examples={EXAMPLES}
        onQuery={search} onRemove={(k) => setFf((p) => removeChip(p, k))} onClear={() => setFf({})} />
      {list.length === 0 ? (
        <div className="card empty">{festivals.length ? t('لا توجد مهرجانات بهذا الوصف. جرّب وصفًا أوسع.') : t('لا توجد مهرجانات مفتوحة للتقديم الآن.')}</div>
      ) : (
        <div className="g3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 }}>
          {list.map((f) => {
            const days = f.submissions_close ? Math.ceil((new Date(f.submissions_close).getTime() - Date.now()) / 86400000) : null;
            const m = fit(f);
            return (
              <div key={f.id} className="card fest-card">
                <div className="fest-cover"><span className="display">{f.name.slice(0, 1)}</span>{days != null && days <= 10 && <span className="soon">{t('يغلق بعد {n} يومًا', { n: Math.max(0, days) })}</span>}</div>
                <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                  <span style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                    <b style={{ fontSize: 17, lineHeight: 1.4 }}>{f.name}</b>
                    {m && m.pct >= 50 && <span className="match num">{t('{n}٪ تطابق', { n: m.pct })}</span>}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--muted)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {(f.city || f.country) && <span><Icon name="globe" size={12} /> {[f.city, f.country].filter(Boolean).join('، ')}</span>}
                    <span><Icon name="cal" size={12} /> {f.submissions_close ? t('آخر موعد {d}', { d: t.dateShort(f.submissions_close) }) : t('التقديم مفتوح')}</span>
                  </span>
                  {f.description && <span style={{ fontSize: 13.5, color: 'var(--ink2)', lineHeight: 1.7, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{f.description}</span>}
                  <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{f.categories.slice(0, 4).map((c) => <span key={c.id} className="chip c-mute">{c.name}</span>)}</span>
                  {m && m.pct >= 50 && m.cat && <span style={{ fontSize: 12.5, color: 'var(--accHi)' }}>✦ {t('«{f}» يناسب قسم {c}', { f: m.film, c: m.cat })}</span>}
                  <span style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 6 }}>
                    {signedIn
                      ? <button type="button" className="btn btn-p btn-sm" style={{ flex: 1 }} onClick={() => setSubmit(f.id)}>{t('قدّم فيلمك')}</button>
                      : <Link href={`/login?mode=signup`} className="btn btn-p btn-sm" style={{ flex: 1 }}>{t('قدّم فيلمك')}</Link>}
                    <Link href={`/f/${f.slug}`} className="btn btn-s btn-sm">{t('التفاصيل')}</Link>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {submit && <SubmitDialog films={films} festivals={festivals} festivalId={submit} onClose={() => setSubmit(null)} />}
    </>
  );
}
