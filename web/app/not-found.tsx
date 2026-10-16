import Link from 'next/link';
export default function NotFound() {
  return <main style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, textAlign: 'center' }}><h1 style={{ fontSize: 40 }}>الصفحة غير موجودة</h1><span style={{ color: 'var(--muted)' }}>ربما تغيّر الرابط أو أُغلق التقديم.</span><Link href="/" className="btn btn-p">الرئيسية</Link></main>;
}
