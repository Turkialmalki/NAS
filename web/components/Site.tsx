import { getT } from '@/lib/i18n/server';
import Link from 'next/link';
import { Logo, LogoMark } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { LangToggle } from './Lang';
import { SiteNav } from './SiteNav';

export function SiteHeader() {
  return <SiteNav />;
}

export function MiniHeader({ right }: { right?: React.ReactNode }) {
  return (
    <header className="hdr">
      <div className="wrap" style={{ height: 64, display: 'flex', alignItems: 'center', gap: 14 }}>
        <Logo /><span style={{ flex: 1 }} /><LangToggle /><ThemeToggle />{right}
      </div>
    </header>
  );
}

const COLS: [string, [string, string][]][] = [
  ['المنصة', [['المزايا', '/features'], ['المهرجانات', '/festivals'], ['الأسعار', '/pricing'], ['من نحن', '/#about']]],
  ['صنّاع الأفلام', [['اكتشف المهرجانات', '/festivals'], ['قدّم فيلمك', '/apply'], ['تابع مشاركتك', '/status']]],
  ['الحساب', [['دخول', '/login'], ['حساب جديد', '/login?mode=signup']]],
  ['قانوني', [['سياسة الخصوصية', '/privacy'], ['الشروط والأحكام', '/terms']]],
];

export async function SiteFooter() {
  const t = await getT();
  return (
    <footer style={{ borderTop: '1px solid var(--line)', background: 'var(--bg2)' }}>
      <div className="wrap" style={{ paddingTop: 60, paddingBottom: 30, display: 'flex', flexDirection: 'column', gap: 44 }}>
        <div className="g5" style={{ display: 'grid', gridTemplateColumns: '1.6fr repeat(4, minmax(0, 1fr))', gap: 32 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Link href="/" className="logo" aria-label="NAS"><LogoMark height={46} tagline id="lgf" /></Link>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: 14.5, lineHeight: 1.85, maxWidth: 280 }}>{t('منصة سعودية لإدارة المهرجانات السينمائية: التقديم والتحكيم والقرار في مكان واحد.')}</p>
          </div>
          {COLS.map(([tx, links]) => (
            <div key={tx} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <b style={{ fontSize: 13, color: 'var(--faint)', fontWeight: 600 }}>{t(tx)}</b>
              {links.map(([l, h]) => <Link key={h} href={h} style={{ color: 'var(--ink2)', fontSize: 14.5 }}>{t(l)}</Link>)}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', paddingTop: 22, borderTop: '1px solid var(--line)', fontSize: 13, color: 'var(--faint)' }}>
          <span>© {t.n(new Date().getFullYear())} {t('NAS. جميع الحقوق محفوظة.')}</span><span>{t('صُنع في السعودية')}</span>
        </div>
      </div>
    </footer>
  );
}
