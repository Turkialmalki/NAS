'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Logo } from '../Logo';
import { ThemeToggle } from '../ThemeToggle';
import { Icon } from '../Icon';
import { switchFestival } from '@/app/app/actions';
import { ar } from '@/lib/fmt';

type F = { id: string; name: string; status: string; edition: number };
const NAV: [string, string, string][] = [['/app', 'grid', 'الرئيسية'], ['/app/films', 'film', 'الأفلام'], ['/app/jury', 'users', 'لجنة التحكيم'], ['/app/reports', 'chart', 'التقارير'], ['/app/settings', 'gear', 'الإعدادات']];
const ST: Record<string, [string, string]> = { open: ['● التقديم مفتوح', 'var(--ok)'], draft: ['● مسودة', 'var(--faint)'], closed: ['● التقديم مغلق', 'var(--info)'] };

export function AppShell({ children, name, isAdmin, role, festivals, currentId, hasReview }: { children: React.ReactNode; name: string; isAdmin: boolean; role: string | null; festivals: F[]; currentId: string | null; hasReview: boolean }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const cur = festivals.find((f) => f.id === currentId);
  const title = [...NAV, ['/app/admin', '', 'إدارة المنصة'], ['/app/new', '', 'مهرجان جديد']].find(([h]) => (h === '/app' ? path === '/app' : path.startsWith(h)))?.[2] || '';
  const link = (href: string, icon: string, label: string) => {
    const on = href === '/app' ? path === '/app' : path.startsWith(href);
    return (
      <Link key={href} href={href} onClick={() => setMenu(false)} aria-current={on ? 'page' : undefined} className={on ? 'on' : ''}
        style={{ height: 42, padding: '0 12px', borderRadius: 11, display: 'flex', alignItems: 'center', gap: 12, color: on ? 'var(--ink)' : 'var(--muted)', fontSize: 15, background: on ? 'var(--s2)' : undefined, fontWeight: on ? 600 : 400 }}>
        <Icon name={icon} /><span style={{ flex: 1 }}>{label}</span>
      </Link>
    );
  };
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside className={`side ${menu ? 'open' : ''}`} style={{ flex: '0 0 248px', background: 'var(--bg2)', borderInlineEnd: '1px solid var(--line)', padding: '18px 14px', display: 'flex', flexDirection: 'column', gap: 4, position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
        <div style={{ padding: '4px 10px 18px' }}><Logo href="/app" id="lgapp" /></div>
        {festivals.length > 0 && (
          <div style={{ position: 'relative', marginBottom: 14 }}>
            <button type="button" onClick={() => setOpen(!open)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 14, background: 'var(--s1)', border: '1px solid var(--line)', color: 'inherit', cursor: 'pointer', textAlign: 'start' }}>
              <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <b style={{ fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cur?.name || 'اختر مهرجانًا'}</b>
                {cur && <span style={{ fontSize: 12, color: ST[cur.status]?.[1] }}>{ST[cur.status]?.[0]}{cur.edition > 1 ? ` · الدورة ${ar(cur.edition)}` : ''}</span>}
              </span>
              <Icon name="m7 10 5 5 5-5" size={14} stroke={2} />
            </button>
            {open && (
              <div className="card" style={{ position: 'absolute', top: '100%', insetInline: 0, marginTop: 6, padding: 6, zIndex: 10, borderRadius: 14 }}>
                {festivals.map((f) => (
                  <button key={f.id} type="button" onClick={() => switchFestival(f.id)} style={{ width: '100%', textAlign: 'start', padding: '10px 12px', borderRadius: 10, border: 0, background: f.id === currentId ? 'var(--s2)' : 'transparent', color: 'var(--ink)', cursor: 'pointer', fontSize: 14 }}>{f.name}</button>
                ))}
                <Link href="/app/new" style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 12px', fontSize: 14, color: 'var(--accHi)' }}><Icon name="plus" size={15} />مهرجان جديد</Link>
              </div>
            )}
          </div>
        )}
        {role && role !== 'reviewer' && NAV.map(([h, i, l]) => link(h, i, l))}
        {(hasReview || isAdmin || !festivals.length) && <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--faint)', padding: '18px 12px 6px' }}>أخرى</span>}
        {hasReview && link('/review', 'play', 'أفلامي للتحكيم')}
        {!festivals.length && link('/app/new', 'plus', 'أنشئ مهرجانك')}
        {isAdmin && link('/app/admin', 'shield', 'إدارة المنصة')}
        <div style={{ marginTop: 'auto', padding: '14px 6px 0', borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accT)', color: 'var(--accHi)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{name.slice(0, 1)}</span>
          <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}><b style={{ fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</b><span style={{ fontSize: 12, color: 'var(--faint)' }}>{isAdmin ? 'مشرف المنصة' : role === 'owner' ? 'مالك المهرجان' : role === 'reviewer' ? 'محكّم' : 'فريق المهرجان'}</span></span>
          <form action="/auth/signout" method="post"><button className="ibtn" aria-label="تسجيل الخروج"><Icon name="out" size={16} /></button></form>
        </div>
      </aside>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: 64, display: 'flex', alignItems: 'center', gap: 10, padding: '0 32px', borderBottom: '1px solid var(--line)', position: 'sticky', top: 0, background: 'var(--nav)', backdropFilter: 'blur(16px)', zIndex: 20 }}>
          <button type="button" className="ibtn hs-show" onClick={() => setMenu(!menu)} aria-label="القائمة"><Icon name="menu" /></button>
          <b style={{ fontSize: 15 }}>{title}</b>
          <div style={{ marginInlineStart: 'auto', display: 'flex', gap: 4, alignItems: 'center' }}><ThemeToggle /></div>
        </div>
        <main className="app-main" style={{ padding: '30px 32px 56px', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1220, width: '100%' }}>{children}</main>
      </div>
    </div>
  );
}
