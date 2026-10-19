'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AUDIENCES, featureHref } from '@/lib/features';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { Icon } from './Icon';
import { useT, setLang } from './Lang';

/** Public site navigation: a features menu grouped by audience, festivals, pricing. */
export function SiteNav() {
  const t = useT();
  const path = usePathname();
  const [open, setOpen] = useState(false);     // desktop features panel
  const [sheet, setSheet] = useState(false);   // mobile sheet
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => { setOpen(false); setSheet(false); }, [path]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); setSheet(false); } };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, []);
  useEffect(() => { document.body.style.overflow = sheet ? 'hidden' : ''; }, [sheet]);
  const enter = () => { clearTimeout(timer.current); setOpen(true); };
  const leave = () => { timer.current = setTimeout(() => setOpen(false), 140); };
  const other = t.lang === 'ar' ? 'en' : 'ar';
  const on = (h: string) => (path === h ? 'on' : '');

  return (
    <header className={`hdr sn ${open ? 'is-open' : ''}`} onMouseLeave={leave}>
      <div className="wrap sn-bar">
        <Logo />
        <nav className="sn-links" aria-label={t('القائمة الرئيسية')}>
          <button type="button" className={`sn-l ${open ? 'on' : ''} ${path === '/features' ? 'on' : ''}`} aria-expanded={open} aria-controls="sn-panel"
            onMouseEnter={enter} onClick={() => setOpen(!open)} onFocus={enter}>
            {t('المزايا')}<Icon name="m6 9 6 6 6-6" size={13} stroke={2.2} className="sn-caret" />
          </button>
          <Link href="/festivals" className={`sn-l ${on('/festivals')}`} onMouseEnter={leave}>{t('المهرجانات')}</Link>
          <Link href="/pricing" className={`sn-l ${on('/pricing')}`} onMouseEnter={leave}>{t('الأسعار')}</Link>
          <Link href="/#about" className="sn-l" onMouseEnter={leave}>{t('من نحن')}</Link>
        </nav>
        <div className="sn-end">
          <button type="button" className="sn-lang hs" onClick={() => setLang(other)} title={other === 'en' ? 'English' : 'العربية'}>
            <Icon name="globe" size={15} />{other === 'en' ? 'English' : 'العربية'}
          </button>
          <span className="hs"><ThemeToggle /></span>
          <Link href="/login" className="sn-l hs">{t('دخول')}</Link>
          <Link href="/login?mode=signup" className="btn btn-p btn-sm">{t('ابدأ مجانًا')}</Link>
          <button type="button" className="ibtn hs-show" aria-label={t('القائمة')} aria-expanded={sheet} onClick={() => setSheet(true)}><Icon name="menu" /></button>
        </div>
      </div>

      {/* desktop features panel */}
      <div id="sn-panel" className="sn-panel" onMouseEnter={enter} hidden={!open}>
        <div className="wrap sn-grid">
          {AUDIENCES.map((a) => (
            <div key={a.id} className="sn-col">
              <Link href={`/features#${a.id}`} className="sn-col-h">{t(a.label)}</Link>
              {a.features.slice(0, 4).map((f) => (
                <Link key={f.id} href={featureHref(a.id, f.id)} className="sn-item">
                  <span className="sn-ic"><Icon name={f.icon} size={16} /></span>
                  <span><b>{t(f.title)}</b><span>{t(f.line)}</span></span>
                </Link>
              ))}
            </div>
          ))}
          <Link href="/features" className="sn-feature">
            <span className="sn-feature-art" aria-hidden="true">{Array.from({ length: 28 }, (_, i) => <span key={i} style={{ background: `hsl(${38 + (i % 7) * 4} ${40 + (i % 5) * 9}% ${18 + ((i * 13) % 40)}%)` }} />)}</span>
            <b>{t('كل ما يقدمه NAS')}</b>
            <span>{t('جولة في المنصة لكل طرف: المهرجان، وصانع الفيلم، ولجنة التحكيم.')}</span>
            <span className="link">{t('اعرض المزايا')}</span>
          </Link>
        </div>
      </div>

      {/* mobile sheet */}
      {sheet && createPortal(
        <div className="sn-sheet" role="dialog" aria-modal="true" aria-label={t('القائمة')}>
          <div className="sn-sheet-top"><Logo /><button type="button" className="ibtn" aria-label={t('إغلاق')} onClick={() => setSheet(false)}><Icon name="x" /></button></div>
          <div className="sn-sheet-body">
            {AUDIENCES.map((a) => (
              <details key={a.id} className="sn-acc">
                <summary>{t(a.label)}<Icon name="plus" size={16} /></summary>
                {a.features.map((f) => <Link key={f.id} href={featureHref(a.id, f.id)} className="sn-acc-i" onClick={() => setSheet(false)}><Icon name={f.icon} size={16} />{t(f.title)}</Link>)}
              </details>
            ))}
            <Link href="/festivals" className="sn-big">{t('المهرجانات')}</Link>
            <Link href="/pricing" className="sn-big">{t('الأسعار')}</Link>
            <Link href="/#about" className="sn-big">{t('من نحن')}</Link>
          </div>
          <div className="sn-sheet-foot">
            <Link href="/login?mode=signup" className="btn btn-p btn-lg" style={{ width: '100%' }}>{t('ابدأ مجانًا')}</Link>
            <Link href="/login" className="btn btn-s btn-lg" style={{ width: '100%' }}>{t('دخول')}</Link>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button type="button" className="sn-lang" onClick={() => setLang(other)}><Icon name="globe" size={15} />{other === 'en' ? 'English' : 'العربية'}</button>
              <ThemeToggle />
            </div>
          </div>
        </div>, document.body,
      )}
    </header>
  );
}
