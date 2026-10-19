import { getT } from '@/lib/i18n/server';
import Link from 'next/link';
import { Logo, LogoMark } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { LangToggle } from './Lang';
import { Icon } from './Icon';
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
  ['المنتج', [['المزايا', '/features'], ['المهرجانات', '/festivals'], ['الأسعار', '/pricing'], ['حساب جديد', '/login?mode=signup']]],
  ['لصنّاع الأفلام', [['أضف فيلمك', '/login?mode=signup&role=filmmaker'], ['قدّم فيلمك', '/apply'], ['تابع مشاركتك', '/status']]],
  ['الشركة', [['من نحن', '/#about'], ['تواصل معنا', '/contact'], ['اطلب عرضًا توضيحيًا', '/contact?topic=demo']]],
  ['قانوني', [['سياسة الخصوصية', '/privacy'], ['الشروط والأحكام', '/terms']]],
];

export async function SiteFooter() {
  const t = await getT();
  return (
    <footer className="ft">
      <div className="wrap ft-in">
        <div className="ft-top">
          <div className="ft-brand">
            <Link href="/" className="logo" aria-label="NAS"><LogoMark height={42} tagline id="lgf" /></Link>
            <p>{t('منصة لإدارة المهرجانات السينمائية: التقديم والتحكيم وجدول العروض في مكان واحد.')}</p>
            <Link href="/contact" className="btn btn-s btn-sm" style={{ alignSelf: 'flex-start' }}><Icon name="mail" size={15} />{t('تواصل معنا')}</Link>
          </div>
          {COLS.map(([tx, links]) => (
            <nav key={tx} className="ft-col" aria-label={t(tx)}>
              <b>{t(tx)}</b>
              {links.map(([l, h]) => <Link key={h} href={h}>{t(l)}</Link>)}
            </nav>
          ))}
        </div>
        <div className="ft-bottom">
          <span>© {t.n(new Date().getFullYear())} {t('NAS. جميع الحقوق محفوظة.')}</span>
          <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}><LangToggle /><ThemeToggle /></span>
        </div>
      </div>
    </footer>
  );
}
