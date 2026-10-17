/** Shown instantly while a dashboard page loads, so navigation feels immediate. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="جارٍ التحميل" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="sk" style={{ width: 220, height: 34 }} />
        <span className="sk" style={{ width: 120, height: 38, borderRadius: 99 }} />
      </div>
      <span className="sk" style={{ height: 110, borderRadius: 20 }} />
      <div className="g4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 }}>
        {[0, 1, 2, 3].map((i) => <span key={i} className="sk" style={{ height: 96, borderRadius: 18 }} />)}
      </div>
      <span className="sk" style={{ height: 260, borderRadius: 20 }} />
    </div>
  );
}
