import Link from 'next/link';
import { Logo, LogoMark } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { ContactButton } from './ContactModal';

const NAV: [string, string][] = [['/#features', 'المنصة'], ['/#insight', 'تحليل الأفلام'], ['/#how', 'كيف تعمل'], ['/#about', 'من نحن']];

export function SiteHeader() {
  return (
    <header className="hdr">
      <div className="wrap nav">
        <div style={{ justifySelf: 'start' }}><Logo /></div>
        <nav className="nl" aria-label="القائمة الرئيسية">{NAV.map(([h, l]) => <Link key={h} href={h}>{l}</Link>)}</nav>
        <div style={{ justifySelf: 'end', display: 'flex', alignItems: 'center', gap: 6 }}>
          <ThemeToggle />
          <Link href="/login" className="hs" style={{ fontSize: 14.5, color: 'var(--ink2)', padding: '0 12px' }}>دخول</Link>
          <Link href="/login?mode=signup" className="btn btn-p btn-sm">ابدأ مع NAS</Link>
        </div>
      </div>
    </header>
  );
}

export function MiniHeader({ right }: { right?: React.ReactNode }) {
  return (
    <header className="hdr">
      <div className="wrap" style={{ height: 64, display: 'flex', alignItems: 'center', gap: 14 }}>
        <Logo /><span style={{ flex: 1 }} /><ThemeToggle />{right}
      </div>
    </header>
  );
}

const COLS: [string, [string, string][]][] = [
  ['المنصة', [['المزايا', '/#features'], ['تحليل الأفلام', '/#insight'], ['كيف تعمل', '/#how'], ['من نحن', '/#about']]],
  ['صنّاع الأفلام', [['قدّم فيلمك', '/apply'], ['تابع مشاركتك', '/status']]],
  ['الحساب', [['دخول', '/login'], ['حساب جديد', '/login?mode=signup']]],
  ['قانوني', [['سياسة الخصوصية', '/privacy'], ['الشروط والأحكام', '/terms']]],
];

export function SiteFooter() {
  return (
    <footer style={{ borderTop: '1px solid var(--line)', background: 'var(--bg2)' }}>
      <div className="wrap" style={{ paddingTop: 60, paddingBottom: 30, display: 'flex', flexDirection: 'column', gap: 44 }}>
        <div className="g5" style={{ display: 'grid', gridTemplateColumns: '1.6fr repeat(4, minmax(0, 1fr))', gap: 32 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Link href="/" className="logo" aria-label="NAS"><LogoMark height={46} tagline id="lgf" /></Link>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: 14.5, lineHeight: 1.85, maxWidth: 280 }}>منصة سعودية لإدارة المهرجانات السينمائية: التقديم والتحكيم والقرار في مكان واحد.</p>
          </div>
          {COLS.map(([t, links]) => (
            <div key={t} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <b style={{ fontSize: 13, color: 'var(--faint)', fontWeight: 600 }}>{t}</b>
              {links.map(([l, h]) => <Link key={h} href={h} style={{ color: 'var(--ink2)', fontSize: 14.5 }}>{l}</Link>)}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', paddingTop: 22, borderTop: '1px solid var(--line)', fontSize: 13, color: 'var(--faint)' }}>
          <span>© {new Date().getFullYear().toLocaleString('ar-SA', { useGrouping: false })} NAS. جميع الحقوق محفوظة.</span><span>صُنع في السعودية</span>
        </div>
      </div>
    </footer>
  );
}
