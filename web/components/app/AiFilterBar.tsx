'use client';
import { useState } from 'react';
import type { Chip } from '@/lib/nlFilter';
import { useT } from '../Lang';
import { Icon, Spinner } from '../Icon';

/** One search box that understands plain language and shows what it understood as chips. */
export function AiFilterBar({ initial = '', chips, onQuery, onRemove, onClear, examples, busy, count, total }: {
  initial?: string; chips: Chip[]; onQuery: (q: string) => void; onRemove: (key: string) => void; onClear: () => void;
  examples: string[]; busy?: boolean; count?: number; total?: number;
}) {
  const t = useT();
  const [q, setQ] = useState(initial);
  return (
    <div className="aif">
      <form onSubmit={(e) => { e.preventDefault(); onQuery(q); }} className="aif-in">
        <span className="aif-ic">{busy ? <Spinner size={15} /> : <Icon name="spark" size={16} />}</span>
        <input value={q} onChange={(e) => { setQ(e.target.value); if (!e.target.value) onClear(); }} placeholder={t('فلترة ذكية: اكتب ما تبحث عنه بكلامك')} aria-label={t('فلترة ذكية')} />
        {q && <button type="button" className="ibtn" style={{ width: 32, height: 32 }} aria-label={t('مسح')} onClick={() => { setQ(''); onClear(); }}><Icon name="x" size={15} /></button>}
        <button className="btn btn-p btn-sm" style={{ height: 38 }}>{t('فلتر')}</button>
      </form>
      {chips.length > 0 ? (
        <div className="aif-chips rise">
          <span className="aif-lbl"><Icon name="spark" size={12} />{t('فهمت')}</span>
          {chips.map((c) => (
            <button key={c.key + c.label} type="button" className="aif-chip" onClick={() => onRemove(c.key)} aria-label={t('إزالة {x}', { x: t(c.label, c.vars) })}>
              {t(c.label, c.vars)}<Icon name="x" size={11} stroke={2.4} />
            </button>
          ))}
          {count != null && <span className="aif-count num">{t('{n} من {m}', { n: count, m: total ?? count })}</span>}
          <button type="button" className="aif-clear" onClick={() => { setQ(''); onClear(); }}>{t('مسح الكل')}</button>
        </div>
      ) : (
        <div className="aif-chips">
          {examples.map((e) => <button key={e} type="button" className="pill-btn" onClick={() => { setQ(t(e)); onQuery(t(e)); }}>{t(e)}</button>)}
        </div>
      )}
    </div>
  );
}
