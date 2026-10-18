'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useT } from '../Lang';
import { Icon } from '../Icon';

type N = { id: string; kind: string; data: Record<string, string | null>; link: string | null; read_at: string | null; created_at: string };

const TEXT: Record<string, [string, string]> = {
  submission: ['مشاركة جديدة: «{title}»', '{festival} · {ref}'],
  assignment: ['أُسند إليك فيلم «{title}»', '{festival}'],
  selected: ['اختير فيلمك «{title}»', 'تهانينا! صدر قرار {festival}'],
  not_selected: ['صدر قرار {festival}', 'بخصوص فيلمك «{title}»'],
};

export function Notifications() {
  const t = useT();
  const [list, setList] = useState<N[]>([]);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const load = async () => {
    const { data } = await supabaseBrowser().from('notifications').select('id,kind,data,link,read_at,created_at').order('created_at', { ascending: false }).limit(20);
    setList((data || []) as N[]);
  };
  useEffect(() => { load(); const i = setInterval(load, 60000); return () => clearInterval(i); }, []);
  useEffect(() => {
    if (!open) return;
    const c = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', c); return () => document.removeEventListener('mousedown', c);
  }, [open]);
  const unread = list.filter((n) => !n.read_at).length;
  async function readAll() {
    const ids = list.filter((n) => !n.read_at).map((n) => n.id);
    if (!ids.length) return;
    setList((l) => l.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
    await supabaseBrowser().from('notifications').update({ read_at: new Date().toISOString() }).in('id', ids);
  }
  return (
    <div ref={box} style={{ position: 'relative' }}>
      <button type="button" className="ibtn" aria-label={t('الإشعارات')} onClick={() => { setOpen(!open); if (!open) setTimeout(readAll, 1500); }}>
        <Icon name="bell" size={17} />{unread > 0 && <span className="badge num">{t.n(unread > 9 ? '9+' : unread)}</span>}
      </button>
      {open && (
        <div className="card pop notif rise">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid var(--line)' }}>
            <b style={{ fontSize: 14.5 }}>{t('الإشعارات')}</b>
            {unread > 0 && <button type="button" className="btn btn-g btn-sm" style={{ height: 28 }} onClick={readAll}>{t('تحديد الكل كمقروء')}</button>}
          </div>
          {list.length === 0 ? <div className="empty" style={{ padding: '30px 16px', fontSize: 14 }}>{t('لا توجد إشعارات بعد.')}</div> : (
            <div style={{ maxHeight: 380, overflowY: 'auto' }}>
              {list.map((n) => {
                const [a, b] = TEXT[n.kind] || ['{title}', ''];
                const v = { title: n.data.title, festival: n.data.festival, ref: n.data.ref };
                return (
                  <Link key={n.id} href={n.link || '#'} onClick={() => setOpen(false)} className={`notif-i${n.read_at ? '' : ' new'}`}>
                    <span className={`notif-dot k-${n.kind}`}><Icon name={n.kind === 'assignment' ? 'play' : n.kind === 'selected' ? 'check' : n.kind === 'submission' ? 'film' : 'mail'} size={13} /></span>
                    <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <b style={{ fontSize: 13.5, fontWeight: 600 }}>{t(a, v)}</b>
                      {b && <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{t(b, v)}</span>}
                    </span>
                    <span style={{ fontSize: 11.5, color: 'var(--faint)', whiteSpace: 'nowrap' }}>{t.ago(n.created_at)}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
