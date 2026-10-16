import Link from 'next/link';
import { requireStaff } from '@/lib/ctx';
import { PageHead, Kpi } from '@/components/app/ui';
import { Icon } from '@/components/Icon';
import { ar, ago, daysLeft } from '@/lib/fmt';

export default async function Dashboard() {
  const { sb, festival, name } = await requireStaff();
  const [{ data: subs }, { data: assigns }, { data: logs }] = await Promise.all([
    sb.from('submissions').select('id,status,decision,created_at,analyses(checks)').eq('festival_id', festival.id),
    sb.from('assignments').select('submission_id,status,submissions!inner(festival_id)').eq('submissions.festival_id', festival.id),
    sb.from('audit_log').select('actor_label,action,target,created_at').eq('festival_id', festival.id).order('created_at', { ascending: false }).limit(6),
  ]);
  const all = subs || [];
  const assigned = new Set((assigns || []).map((a) => a.submission_id));
  const week = all.filter((s) => Date.now() - new Date(s.created_at).getTime() < 7 * 86400000).length;
  const unassigned = all.filter((s) => !assigned.has(s.id)).length;
  const reviewed = all.filter((s) => s.status === 'reviewed').length;
  const waiting = all.filter((s) => s.status === 'reviewed' && s.decision === 'pending').length;
  const broken = all.filter((s) => ((s.analyses as unknown as { checks: { ok: boolean; text: string }[] } | null)?.checks || []).some((c) => !c.ok && /رابط/.test(c.text))).length;
  const left = daysLeft(festival.submissions_close);
  const at = festival.status === 'draft' ? 0 : festival.status === 'open' ? (all.length ? (assigned.size ? 3 : 2) : 1) : waiting || reviewed < all.length ? 4 : 5;
  const C = ['إنشاء المهرجان', 'فتح التقديم', 'استقبال وتحليل', 'توزيع على المحكّمين', 'التقييم', 'إعلان النتائج'];
  const todo: [string, string, string, string][] = [];
  if (festival.status === 'draft') todo.push(['صفحة التقديم غير منشورة', 'انشرها من الإعدادات ليبدأ استقبال الأفلام.', 'الإعدادات', '/app/settings']);
  if (unassigned) todo.push([`${ar(unassigned)} ${unassigned === 1 ? 'فيلم' : 'أفلام'} بدون محكّم`, 'جهّزنا لك توزيعًا حسب التخصص وعدد الأفلام عند كل محكّم.', 'وزّعها', '/app/jury']);
  if (waiting) todo.push([`${ar(waiting)} ${waiting === 1 ? 'فيلم ينتظر' : 'أفلام تنتظر'} قرارك`, 'اكتملت تقييمات لجنة التحكيم عليها.', 'راجعها', '/app/films?st=reviewed']);
  if (broken) todo.push([`${ar(broken)} روابط مشاهدة لا تعمل`, 'تواصل مع أصحابها لتحديث الروابط.', 'اعرضها', '/app/films']);
  if (!todo.length) todo.push(['كل شيء على ما يرام', all.length ? 'لا توجد مهام عاجلة اليوم.' : 'شارك رابط التقديم لتبدأ الأفلام بالوصول.', all.length ? 'الأفلام' : 'صفحة التقديم', all.length ? '/app/films' : `/f/${festival.slug}`]);
  const hour = new Date().getHours();
  return (
    <>
      <PageHead title={`${hour < 12 ? 'صباح الخير' : 'مساء الخير'}، ${name}`} sub={left != null && festival.status === 'open' ? `باقي ${ar(left)} يومًا على إغلاق التقديم.` : festival.name}
        right={<Link href={`/f/${festival.slug}`} target="_blank" className="btn btn-s btn-sm"><Icon name="globe" size={16} />صفحة التقديم</Link>} />
      <div className="card" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><b style={{ fontSize: 16 }}>وين وصلت الدورة</b><span style={{ fontSize: 13.5, color: 'var(--faint)' }}>الخطوة {ar(at + 1)} من ٦</span></div>
        <div className="g6" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 8 }}>
          {C.map((t, i) => (
            <div key={t} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ height: 5, borderRadius: 99, background: i < at ? 'var(--acc)' : i === at ? 'linear-gradient(90deg, var(--s3) 40%, var(--acc) 40%)' : 'var(--s3)' }} />
              <span style={{ fontSize: 13.5, color: i <= at ? 'var(--ink)' : 'var(--faint)', fontWeight: i <= at ? 600 : 400 }}>{t}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="g4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
        <Kpi l="المشاركات" v={ar(all.length)} d={`+${ar(week)} هذا الأسبوع`} href="/app/films" />
        <Kpi l="بدون محكّم" v={ar(unassigned)} d="تحتاج توزيع" href="/app/jury" />
        <Kpi l="تمت مراجعتها" v={ar(reviewed)} d={`من ${ar(all.length)}`} href="/app/films" />
        <Kpi l="تنتظر قرارك" v={ar(waiting)} d="اكتمل تقييمها" href="/app/films?st=reviewed" />
      </div>
      <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 6, borderColor: 'var(--accL)', background: 'linear-gradient(180deg, var(--accT), rgba(0,0,0,0) 50%), var(--s1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}><span style={{ color: 'var(--acc)' }}><Icon name="spark" size={19} /></span><b style={{ fontSize: 17 }}>ملخص اليوم</b><span className="chip c-mute" style={{ marginInlineStart: 'auto' }}>من NAS</span></div>
        {todo.map(([t, p, a, h]) => (
          <div key={t} className="row" style={{ padding: '14px 0' }}>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}><b style={{ fontSize: 15 }}>{t}</b><span style={{ fontSize: 13.5, color: 'var(--muted)' }}>{p}</span></span>
            <Link href={h} className="btn btn-q btn-sm">{a}</Link>
          </div>
        ))}
      </div>
      {(logs || []).length > 0 && (
        <div className="card" style={{ padding: '22px 24px' }}>
          <b style={{ fontSize: 16, display: 'block', marginBottom: 6 }}>آخر النشاط</b>
          {(logs || []).map((l, i) => (
            <div key={i} className="row"><span style={{ fontSize: 14, color: 'var(--ink2)' }}><b style={{ color: 'var(--ink)' }}>{l.actor_label || 'NAS'}</b> · {l.action} · <span className="num" style={{ direction: 'ltr', display: 'inline-block' }}>{l.target}</span></span><span style={{ fontSize: 12.5, color: 'var(--faint)', whiteSpace: 'nowrap' }}>{ago(l.created_at)}</span></div>
          ))}
        </div>
      )}
    </>
  );
}
