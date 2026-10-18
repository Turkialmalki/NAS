import { getT } from '@/lib/i18n/server';
import { requireStaff } from '@/lib/ctx';
import { PageHead } from '@/components/app/ui';
import { STATUS } from '@/lib/fmt';
import { ExportButton } from '@/components/app/ExportButton';

export default async function Reports() {
  const t = await getT();
  const { sb, festival } = await requireStaff();
  const [{ data: subs }, { data: logs }] = await Promise.all([
    sb.from('submissions').select('ref_code,title,director_name,email,genre,country,duration_min,status,decision,created_at,analyses(score)').eq('festival_id', festival.id).order('created_at'),
    sb.from('audit_log').select('actor_label,action,target,created_at').eq('festival_id', festival.id).order('created_at', { ascending: false }).limit(30),
  ]);
  const all = subs || [];
  // weekly counts (last 12 weeks)
  const now = Date.now();
  const weeks = Array.from({ length: 12 }, (_, i) => all.filter((s) => { const w = Math.floor((now - new Date(s.created_at).getTime()) / (7 * 86400000)); return w === 11 - i; }).length);
  const maxW = Math.max(1, ...weeks);
  const group = (k: 'genre' | 'country' | 'status') => {
    const m = new Map<string, number>();
    all.forEach((s) => { const v = (k === 'status' ? STATUS[s.status]?.[0] : s[k]) || 'غير محدد'; m.set(v, (m.get(v) || 0) + 1); });
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  };
  const breaks: [string, [string, number][]][] = [['حسب النوع', group('genre')], ['حسب البلد', group('country')], ['حسب الحالة', group('status')]];
  const rows = all.map((s) => ({ ref: s.ref_code, title: s.title, director: s.director_name, email: s.email, genre: s.genre || '', country: s.country || '', minutes: s.duration_min || '', status: STATUS[s.status]?.[0] || s.status, decision: s.decision, score: (s.analyses as unknown as { score: number } | null)?.score ?? '' }));
  return (
    <>
      <PageHead title={t('التقارير')} sub={t('{name} · {v1} مشاركة', { name: festival.name, v1: t.n(all.length) })} right={<ExportButton rows={rows} name={festival.slug} />} />
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}><b style={{ fontSize: 16 }}>{t('المشاركات أسبوعيًا')}</b><span className="num" style={{ fontSize: 13.5, color: 'var(--faint)' }}>{t('آخر {n} أسبوعًا', { n: 12 })}</span></div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 170 }}>
          {weeks.map((v, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
              <span className="num" style={{ fontSize: 12, color: 'var(--muted)' }}>{v ? t.n(v) : ''}</span>
              <span style={{ width: '100%', maxWidth: 34, borderRadius: '6px 6px 3px 3px', background: v ? 'var(--acc)' : 'var(--s3)', height: Math.max(3, Math.round((v / maxW) * 120)) }} />
              <span className="num" style={{ fontSize: 11.5, color: 'var(--faint)' }}>{t.n(i + 1)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="g3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
        {breaks.map(([tx, list]) => {
          const max = Math.max(1, ...list.map((x) => x[1]));
          return (
            <div key={tx} className="card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <b style={{ fontSize: 15.5, marginBottom: 4 }}>{t(tx)}</b>
              {list.length === 0 && <span style={{ color: 'var(--faint)', fontSize: 14 }}>{t('لا توجد بيانات بعد.')}</span>}
              {list.map(([l, v]) => (
                <div key={l} style={{ display: 'grid', gridTemplateColumns: '96px minmax(0, 1fr) 34px', alignItems: 'center', gap: 12, fontSize: 13.5 }}>
                  <span style={{ color: 'var(--ink2)' }}>{t(l)}</span><span className="bar"><span style={{ width: `${Math.round((v / max) * 100)}%` }} /></span><b className="num" style={{ textAlign: 'end' }}>{t.n(v)}</b>
                </div>
              ))}
            </div>
          );
        })}
      </div>
      <div className="card" style={{ padding: '22px 24px' }}>
        <b style={{ fontSize: 16, display: 'block', marginBottom: 6 }}>{t('سجل الإجراءات')}</b>
        {(logs || []).length === 0 && <span style={{ color: 'var(--faint)', fontSize: 14 }}>{t('لا يوجد نشاط بعد.')}</span>}
        {(logs || []).map((l, i) => (
          <div key={i} className="row"><span style={{ display: 'flex', gap: 12, alignItems: 'center' }}><span className="av" style={{ margin: 0 }}>{(l.actor_label || 'N').slice(0, 1)}</span><span style={{ fontSize: 14, color: 'var(--ink2)' }}><b style={{ color: 'var(--ink)' }}>{l.actor_label || 'NAS'}</b> · {t(l.action)} · <span className="num" style={{ direction: 'ltr', display: 'inline-block' }}>{l.target}</span></span></span><span style={{ fontSize: 12.5, color: 'var(--faint)', whiteSpace: 'nowrap' }}>{t.ago(l.created_at)}</span></div>
        ))}
      </div>
    </>
  );
}
