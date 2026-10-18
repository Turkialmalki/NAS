'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '../Lang';
import { Icon } from '../Icon';

type Item = { id: string; icon: string; label: string; hint?: string; href: string; ai?: boolean };

/** ⌘K: jump anywhere, run common actions, or ask in plain language (turned into filters). */
export function CommandPalette({ mode, nav, onClose, canFestival }: { mode: 'festival' | 'filmmaker'; nav: [string, string, string][]; onClose: () => void; canFestival: boolean }) {
  const t = useT();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [i, setI] = useState(0);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);

  const base: Item[] = useMemo(() => {
    const actions: Item[] = mode === 'festival'
      ? [
        { id: 'a1', icon: 'up', label: t('ارفع فيلمًا وحلّله'), href: '/app/films?add=1' },
        { id: 'a2', icon: 'users', label: t('ادعُ محكّمًا'), href: '/app/jury?invite=1' },
        { id: 'a3', icon: 'cal', label: t('اقترح جدول العروض'), href: '/app/programme?auto=1' },
        { id: 'a4', icon: 'globe', label: t('افتح صفحة التقديم'), href: '/app/settings' },
      ]
      : [
        { id: 'b1', icon: 'up', label: t('أضف فيلمًا جديدًا'), href: '/app/me/films/new' },
        { id: 'b2', icon: 'globe', label: t('اكتشف المهرجانات المفتوحة'), href: '/app/me/festivals' },
        ...(canFestival ? [{ id: 'b3', icon: 'grid', label: t('مساحة المهرجان'), href: '/app' }] : [{ id: 'b3', icon: 'plus', label: t('أنشئ مهرجانك'), href: '/app/new' }]),
      ];
    return [...nav.map(([h, ic, l]) => ({ id: h, icon: ic, label: t(l), hint: t('انتقل'), href: h })), ...actions];
  }, [mode, nav, t, canFestival]);

  const items: Item[] = useMemo(() => {
    const s = q.trim().toLowerCase();
    const hits = s ? base.filter((x) => x.label.toLowerCase().includes(s)) : base;
    if (!s) return hits;
    const ai: Item = { id: 'ai', icon: 'spark', ai: true, label: q.trim(), hint: t(mode === 'festival' ? 'فلترة الأفلام بالذكاء الاصطناعي' : 'ابحث في المهرجانات بالذكاء الاصطناعي'),
      href: mode === 'festival' ? `/app/films?ai=${encodeURIComponent(q.trim())}` : `/app/me/festivals?ai=${encodeURIComponent(q.trim())}` };
    return [ai, ...hits];
  }, [q, base, mode, t]);

  const go = (x?: Item) => { if (!x) return; onClose(); router.push(x.href); };
  const examples = mode === 'festival'
    ? ['وثائقيات أقل من ٣٠ دقيقة بدون محكّم', 'أفلام سعودية تقييمها أعلى من ٧', 'أفلام مقبولة لم تُجدول بعد']
    : ['مهرجانات أفلام قصيرة في السعودية', 'مهرجانات مجانية يغلق التقديم فيها هذا الشهر', 'مهرجانات للوثائقي'];

  return (
    <div className="modal-bg" style={{ alignItems: 'flex-start', paddingTop: '12vh' }} onClick={(e) => e.target === e.currentTarget && onClose()} role="dialog" aria-modal="true" aria-label={t('البحث والأوامر')}>
      <div className="card cmdk rise">
        <div className="cmdk-in">
          <span style={{ color: 'var(--acc)', display: 'inline-flex' }}><Icon name="spark" size={18} /></span>
          <input ref={ref} value={q} onChange={(e) => { setQ(e.target.value); setI(0); }} placeholder={t('اكتب ما تريد، مثلًا: {x}', { x: t(examples[0]) })}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'ArrowDown') { e.preventDefault(); setI((v) => Math.min(items.length - 1, v + 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setI((v) => Math.max(0, v - 1)); }
              if (e.key === 'Enter') { e.preventDefault(); go(items[i]); }
            }} aria-label={t('بحث')} />
          <kbd>esc</kbd>
        </div>
        <div className="cmdk-list" role="listbox">
          {items.map((x, k) => (
            <button key={x.id} type="button" role="option" aria-selected={k === i} className={`cmdk-i${k === i ? ' on' : ''}`} onMouseEnter={() => setI(k)} onClick={() => go(x)}>
              <span className={`cmdk-ic${x.ai ? ' ai' : ''}`}><Icon name={x.icon} size={15} /></span>
              <span style={{ flex: 1, minWidth: 0, textAlign: 'start', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.ai ? <>«{x.label}»</> : x.label}</span>
              {x.hint && <span className="cmdk-hint">{x.hint}</span>}
            </button>
          ))}
        </div>
        {!q && (
          <div className="cmdk-ex">
            <span>{t('جرّب أن تكتب')}</span>
            {examples.map((e) => <button key={e} type="button" className="pill-btn" onClick={() => { setQ(t(e)); ref.current?.focus(); }}>{t(e)}</button>)}
          </div>
        )}
      </div>
    </div>
  );
}
