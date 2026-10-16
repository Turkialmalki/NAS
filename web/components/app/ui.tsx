export function PageHead({ title, sub, right }: { title: string; sub?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
      <div><h1 style={{ fontSize: 30 }}>{title}</h1>{sub && <p style={{ margin: '8px 0 0', color: 'var(--muted)', fontSize: 15.5 }}>{sub}</p>}</div>
      {right}
    </div>
  );
}
export function Kpi({ l, v, d, href }: { l: string; v: string; d?: string; href?: string }) {
  const inner = <><span style={{ fontSize: 13.5, color: 'var(--muted)' }}>{l}</span><b className="num" style={{ fontSize: 32, fontWeight: 600, lineHeight: 1.15 }}>{v}</b>{d && <span style={{ fontSize: 12.5, color: 'var(--faint)' }}>{d}</span>}</>;
  const st = { padding: 20, display: 'flex', flexDirection: 'column' as const, gap: 6 };
  return href ? <a href={href} className="card" style={st}>{inner}</a> : <div className="card" style={st}>{inner}</div>;
}
export function Ring({ score, size = 84 }: { score: number | null; size?: number }) {
  const pct = score == null ? 0 : Math.round(score * 10);
  const AR = '٠١٢٣٤٥٦٧٨٩';
  const t = score == null ? '—' : score.toFixed(1).replace(/\d/g, (d) => AR[+d]).replace('.', '٫');
  return (
    <span className="ring" style={{ width: size, height: size, background: `conic-gradient(var(--acc) 0 ${pct}%, var(--s3) ${pct}% 100%)` }}>
      <span style={{ width: size - 14, height: size - 14 }}><b className="num" style={{ fontSize: size * 0.28 }}>{t}</b></span>
    </span>
  );
}
