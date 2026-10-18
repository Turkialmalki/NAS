'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Logo } from '../Logo';
import { ThemeToggle } from '../ThemeToggle';
import { LangToggle, useT } from '../Lang';
import { Icon } from '../Icon';
import { switchFestival } from '@/app/app/actions';
import { CommandPalette } from './CommandPalette';
import { Notifications } from './Notifications';

type F = { id: string; name: string; status: string; edition: number };
type Mode = 'festival' | 'filmmaker';

const FESTIVAL_NAV: [string, string, string][] = [
  ['/app', 'grid', 'الرئيسية'], ['/app/films', 'film', 'الأفلام'], ['/app/jury', 'users', 'لجنة التحكيم'],
  ['/app/programme', 'cal', 'البرنامج'], ['/app/reports', 'chart', 'التقارير'], ['/app/settings', 'gear', 'الإعدادات'],
];
const FILMMAKER_NAV: [string, string, string][] = [['/app/me', 'grid', 'الرئيسية'], ['/app/me/films', 'film', 'أفلامي'], ['/app/me/festivals', 'globe', 'اكتشف المهرجانات']];

export function AppShell({ children, name, isAdmin, role, festivals, currentId, hasReview, accountType }: {
  children: React.ReactNode; name: string; isAdmin: boolean; role: string | null; festivals: F[]; currentId: string | null; hasReview: boolean; accountType: string | null;
}) {
  const t = useT();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [going, setGoing] = useState<string | null>(null);
  const [palette, setPalette] = useState(false);
  useEffect(() => { setGoing(null); }, [path]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((p) => !p); } };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, []);
  const here = going || path;
  const mode: Mode = here.startsWith('/app/me') || (!festivals.length && accountType === 'filmmaker') ? 'filmmaker' : 'festival';
  const cur = festivals.find((f) => f.id === currentId);
  const nav = mode === 'filmmaker' ? FILMMAKER_NAV : role && role !== 'reviewer' ? FESTIVAL_NAV : [];
  const all: [string, string, string][] = [...nav, ['/app/admin', 'shield', 'إدارة المنصة'], ['/app/new', 'plus', 'مهرجان جديد']];
  const title = all.filter(([h]) => (h === '/app' || h === '/app/me' ? here === h : here.startsWith(h))).sort((a, b) => b[0].length - a[0].length)[0]?.[2] || '';
  const ST: Record<string, [string, string]> = { open: [t('التقديم مفتوح'), 'var(--ok)'], draft: [t('مسودة'), 'var(--faint)'], closed: [t('التقديم مغلق'), 'var(--info)'] };

  const link = (href: string, icon: string, label: string) => {
    const on = href === '/app' || href === '/app/me' ? here === href : here.startsWith(href);
    return (
      <Link key={href} href={href} onClick={() => { setMenu(false); if (href !== path) setGoing(href); }} aria-current={on ? 'page' : undefined} className={`nav-i${on ? ' on' : ''}`}>
        <Icon name={icon} /><span style={{ flex: 1 }}>{t(label)}</span>
      </Link>
    );
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {going && <span className="navbar-progress" key={going} />}
      <aside className={`side ${menu ? 'open' : ''}`}>
        <div style={{ padding: '4px 10px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><Logo href={mode === 'filmmaker' ? '/app/me' : '/app'} id="lgapp" /></div>

        {mode === 'festival' && festivals.length > 0 && (
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <button type="button" onClick={() => setOpen(!open)} className="fest-switch">
              <span className="fest-av">{cur?.name.slice(0, 1) || 'N'}</span>
              <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'start' }}>
                <b style={{ fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cur?.name || t('اختر مهرجانًا')}</b>
                {cur && <span style={{ fontSize: 12, color: ST[cur.status]?.[1] }}>● {ST[cur.status]?.[0]}{cur.edition > 1 ? t(' · {v0}', { v0: t('الدورة {n}', { n: cur.edition }) }) : ''}</span>}
              </span>
              <Icon name="m7 10 5 5 5-5" size={14} stroke={2} />
            </button>
            {open && (
              <div className="card pop" style={{ position: 'absolute', top: '100%', insetInline: 0, marginTop: 6, padding: 6, zIndex: 30, borderRadius: 14 }}>
                {festivals.map((f) => (
                  <button key={f.id} type="button" onClick={() => { setOpen(false); setGoing('/app'); switchFestival(f.id); }} className={`pop-i${f.id === currentId ? ' on' : ''}`}>{f.name}</button>
                ))}
                <Link href="/app/new" className="pop-i" style={{ color: 'var(--accHi)' }} onClick={() => setOpen(false)}><Icon name="plus" size={15} />{t('مهرجان جديد')}</Link>
              </div>
            )}
          </div>
        )}

        {(mode === 'filmmaker' || festivals.length > 0) && (
          <Link href={mode === 'filmmaker' ? '/app/me/films/new' : '/app/films?add=1'} className="btn btn-p side-add" onClick={() => setMenu(false)}>
            <Icon name="plus" size={16} stroke={2.4} />{t('أضف فيلمًا')}
          </Link>
        )}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }} aria-label={t('القائمة')}>{nav.map(([h, i, l]) => link(h, i, l))}</nav>

        {(hasReview || isAdmin) && <span className="side-h">{t('المزيد')}</span>}
        {hasReview && link('/review', 'play', 'أفلامي للتحكيم')}
        {isAdmin && link('/app/admin', 'shield', 'إدارة المنصة')}

        <div style={{ marginTop: 'auto', padding: '14px 6px 0', borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="me-av">{name.slice(0, 1)}</span>
          <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <b style={{ fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</b>
            <span style={{ fontSize: 12, color: 'var(--faint)' }}>{t(mode === 'filmmaker' ? 'صانع أفلام' : isAdmin ? 'مشرف المنصة' : role === 'owner' ? 'مالك المهرجان' : role === 'reviewer' ? 'محكّم' : 'فريق المهرجان')}</span>
          </span>
          <Link href="/welcome?change=1" className="ibtn" aria-label={t('تغيير الدور')} title={t('تغيير الدور')}><Icon name="gear" size={16} /></Link>
          <form action="/auth/signout" method="post"><button className="ibtn" aria-label={t('تسجيل الخروج')}><Icon name="out" size={16} /></button></form>
        </div>
      </aside>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div className="topbar">
          <button type="button" className="ibtn hs-show" onClick={() => setMenu(!menu)} aria-label={t('القائمة')}><Icon name="menu" /></button>
          <b style={{ fontSize: 15 }}>{t(title)}</b>
          <button type="button" className="cmdk-btn" onClick={() => setPalette(true)}>
            <Icon name="spark" size={15} /><span className="hide-sm">{t(mode === 'filmmaker' ? 'ابحث أو اسأل عن المهرجانات…' : 'ابحث أو اطلب أي شيء…')}</span><kbd className="hide-sm">⌘K</kbd>
          </button>
          <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}><Notifications /><LangToggle /><ThemeToggle /></div>
        </div>
        <main className="app-main">{children}</main>
      </div>
      {palette && <CommandPalette mode={mode} nav={nav} onClose={() => setPalette(false)} canFestival={festivals.length > 0} />}
      {menu && <div className="scrim" onClick={() => setMenu(false)} />}
    </div>
  );
}
