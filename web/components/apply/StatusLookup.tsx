'use client';

import { useT } from '@/components/Lang';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { DECISION } from '@/lib/fmt';
import { Spinner } from '../Icon';

type Row = { ref_code: string; title: string; festival: string; category: string | null; status: string; decision: string; created_at: string; results_on: string | null; analyzed_at: string | null; reviewed: boolean; checks: { ok: boolean; text: string }[] };

export function StatusLookup({ initialRef }: { initialRef: string }) {
  const t = useT();
  const [ref, setRef] = useState(initialRef);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [row, setRow] = useState<Row | null>(null);
  const [miss, setMiss] = useState(false);

  async function look(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMiss(false); setRow(null);
    const { data } = await supabaseBrowser().rpc('submission_status', { p_ref: ref, p_email: email });
    setBusy(false);
    if (data && data[0]) setRow(data[0] as Row); else setMiss(true);
  }

  const decided = row && row.decision !== 'pending';
  const cur = !row ? 0 : decided ? 4 : row.reviewed ? 3 : row.analyzed_at ? 2 : 1;
  const steps: [string, string][] = row ? [
    ['استلمنا فيلمك', t.dateShort(row.created_at)],
    ['اكتمل التحليل', row.analyzed_at ? t.dateShort(row.analyzed_at) : 'قريبًا'],
    ['عند لجنة التحكيم', cur === 2 ? 'الآن' : cur > 2 ? 'اكتمل' : '—'],
    ['القرار', decided ? DECISION[row.decision][0] : row.results_on ? t.date(row.results_on) : 'يُعلن لاحقًا'],
  ] : [];
  const chip = !row ? null : decided ? DECISION[row.decision] : cur === 2 || cur === 3 ? ['عند لجنة التحكيم', 'c-info'] : ['قيد المعالجة', 'c-mute'];

  return (
    <>
      <form onSubmit={look} className="card" style={{ padding: 18, display: 'flex', gap: 10, flexWrap: 'wrap', borderRadius: 20 }}>
        <input className="fld num" dir="ltr" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="NAS-2026-00175" aria-label={t('الرقم المرجعي')} style={{ flex: '1 1 200px' }} required />
        <input className="fld" dir="ltr" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" aria-label={t('البريد')} style={{ flex: '1 1 200px' }} required />
        <button className="btn btn-p" style={{ height: 48 }} disabled={busy}>{busy ? <Spinner size={16} /> : t('اعرض الحالة')}</button>
      </form>
      {miss && <div className="card empty" style={{ borderRadius: 20 }}>{t('لم نجد مشاركة بهذا الرقم والبريد. تأكد منهما وحاول مرة أخرى.')}</div>}
      {row && chip && (
        <div className="card rise" style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 22, borderRadius: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><b style={{ fontSize: 18 }}>{row.title}</b><span style={{ fontSize: 13, color: 'var(--faint)' }}>{row.festival}{row.category ? ` · ${row.category}` : ''} · <span className="num" style={{ direction: 'ltr' }}>{row.ref_code}</span></span></span>
            <span className={`chip ${chip[1]}`}><span className="dot" />{t(chip[0])}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {steps.map(([tx, w], i) => (
              <div key={tx} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ width: 26, height: 26, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700,
                    ...(i < cur ? { background: 'var(--acc)', color: 'var(--onAcc)' } : i === cur ? { border: '2px solid var(--acc)', color: 'var(--accHi)' } : { border: '1.5px solid var(--line2)', color: 'var(--faint)' }) }}>{i < cur ? '✓' : t.n(i + 1)}</span>
                  {i < steps.length - 1 && <span style={{ width: 2, height: 30, background: i < cur ? 'var(--acc)' : 'var(--line2)' }} />}
                </span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 3 }}><b style={{ fontSize: 15, ...(i > cur ? { color: 'var(--muted)', fontWeight: 500 } : {}) }}>{t(tx)}</b><span style={{ fontSize: 13, color: 'var(--faint)' }}>{t(w)}</span></span>
              </div>
            ))}
          </div>
          {row.checks?.some((c) => !c.ok) && (
            <div style={{ padding: '14px 16px', borderRadius: 14, background: 'var(--s2)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <b style={{ fontSize: 14 }}>{t('ملاحظات على مشاركتك')}</b>
              {row.checks.filter((c) => !c.ok).map((c) => <span key={c.text} style={{ fontSize: 14, color: 'var(--ink2)' }}><b style={{ color: 'var(--acc)' }}>!</b> {c.text}</span>)}
            </div>
          )}
          <div style={{ fontSize: 14.5, color: 'var(--muted)', lineHeight: 1.8 }}>{decided ? t('صدر القرار. شكرًا لمشاركتك.') : t('نرسل لك بريدًا فور صدور القرار.')}</div>
        </div>
      )}
    </>
  );
}
