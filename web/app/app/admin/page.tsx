import { getT } from '@/lib/i18n/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCtx } from '@/lib/ctx';
import { PageHead } from '@/components/app/ui';
import { Icon } from '@/components/Icon';

const ST: Record<string, [string, string]> = { open: ['مفتوح', 'c-ok'], draft: ['مسودة', 'c-mute'], closed: ['مغلق', 'c-info'] };

export default async function Admin({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { sb, isAdmin } = await getCtx();
  if (!isAdmin) redirect('/app');
  const t = await getT();
  const tab = (await searchParams).t || 'f';
  const [{ data: fests }, { data: users }, { data: subs }, { data: contacts }, { data: mems }] = await Promise.all([
    sb.from('festivals').select('id,name,slug,city,status,edition,created_at').order('created_at', { ascending: false }),
    sb.from('profiles').select('id,full_name,email,is_admin,created_at').order('created_at', { ascending: false }),
    sb.from('submissions').select('festival_id'),
    sb.from('contact_requests').select('name,email,org,created_at').order('created_at', { ascending: false }).limit(50),
    sb.from('festival_members').select('festival_id,user_id,role'),
  ]);
  const count = (id: string) => (subs || []).filter((s) => s.festival_id === id).length;
  const team = (id: string) => (mems || []).filter((m) => m.festival_id === id).length;
  const tabs: [string, string][] = [['f', t('المهرجانات ({n})', { n: (fests || []).length })], ['u', t('المستخدمون ({n})', { n: (users || []).length })], ['c', t('طلبات التواصل ({n})', { n: (contacts || []).length })]];
  return (
    <>
      <PageHead title={t('إدارة المنصة')} sub={t('كل المهرجانات والمستخدمين.')} right={<Link href="/app/new" className="btn btn-p btn-sm"><Icon name="plus" size={16} />{t('مهرجان جديد')}</Link>} />
      <div className="seg" style={{ alignSelf: 'flex-start' }}>{tabs.map(([k, l]) => <Link key={k} href={`/app/admin?t=${k}`} className={tab === k ? 'on' : ''} style={{ height: 34, padding: '0 15px', borderRadius: 10, display: 'inline-flex', alignItems: 'center', fontSize: 14, fontWeight: 600, color: tab === k ? 'var(--ink)' : 'var(--muted)', background: tab === k ? 'var(--s1)' : undefined }}>{l}</Link>)}</div>
      <div className="card" style={{ overflowX: 'auto', padding: '4px 6px' }}>
        {tab === 'f' && <table className="tbl"><thead><tr><th>{t('المهرجان')}</th><th>{t('المدينة')}</th><th>{t('الحالة')}</th><th>{t('المشاركات')}</th><th>{t('الفريق')}</th><th>{t('أُنشئ')}</th></tr></thead><tbody>
          {(fests || []).map((f) => <tr key={f.id}><td><b>{f.name}</b><div className="num" style={{ fontSize: 12.5, color: 'var(--faint)', direction: 'ltr', textAlign: 'end' }}>/f/{f.slug}</div></td><td style={{ color: 'var(--muted)' }}>{f.city || '—'}</td><td><span className={`chip ${ST[f.status][1]}`}><span className="dot" />{t(ST[f.status][0])}</span></td><td className="num">{t.n(count(f.id))}</td><td className="num">{t.n(team(f.id))}</td><td style={{ color: 'var(--faint)' }}>{t.date(f.created_at)}</td></tr>)}
        </tbody></table>}
        {tab === 'u' && <table className="tbl"><thead><tr><th>{t('المستخدم')}</th><th>{t('البريد')}</th><th>{t('الدور')}</th><th>{t('انضم')}</th></tr></thead><tbody>
          {(users || []).map((u) => { const r = (mems || []).filter((m) => m.user_id === u.id); return <tr key={u.id}><td><b>{u.full_name || '—'}</b></td><td className="num" style={{ direction: 'ltr', textAlign: 'end', color: 'var(--muted)' }}>{u.email}</td><td><span className={`chip ${u.is_admin ? 'c-acc' : 'c-mute'}`}>{u.is_admin ? t('مشرف المنصة') : r.length ? t('{v0} مهرجان', { v0: t.n(r.length) }) : t('بدون مهرجان')}</span></td><td style={{ color: 'var(--faint)' }}>{t.ago(u.created_at)}</td></tr>; })}
        </tbody></table>}
        {tab === 'c' && ((contacts || []).length ? <table className="tbl"><thead><tr><th>{t('الاسم')}</th><th>{t('البريد')}</th><th>{t('الجهة')}</th><th>{t('متى')}</th></tr></thead><tbody>
          {(contacts || []).map((c, i) => <tr key={i}><td><b>{c.name || '—'}</b></td><td className="num" style={{ direction: 'ltr', textAlign: 'end' }}><a href={`mailto:${c.email}`} className="link">{c.email}</a></td><td>{c.org || '—'}</td><td style={{ color: 'var(--faint)' }}>{t.ago(c.created_at)}</td></tr>)}
        </tbody></table> : <div className="empty">{t('لا توجد طلبات بعد.')}</div>)}
      </div>
    </>
  );
}
