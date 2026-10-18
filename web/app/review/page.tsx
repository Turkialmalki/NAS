import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { sessionUser } from '@/lib/ctx';
import { ReviewDesk } from '@/components/app/ReviewDesk';
import { embedUrl } from '@/lib/embed';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'أفلامك للتحكيم' };

export default async function ReviewPage() {
  const sb = await supabaseServer();
  const user = await sessionUser();
  if (!user) redirect('/login?next=/review');
  await sb.rpc('accept_my_invites');
  const [{ data: prof }, { data: rows }, { data: mems }] = await Promise.all([
    sb.from('profiles').select('full_name,email').eq('id', user.id).maybeSingle(),
    sb.from('assignments').select('status,due_at, submission:submissions(id,ref_code,title,genre,duration_min,synopsis,screener_url,screener_path,festival_id,category:categories(name),festival:festivals(name,review_deadline),analysis:analyses(themes,tone,headline,checks))').eq('reviewer_id', user.id),
    sb.from('festival_members').select('festival_id,role').eq('user_id', user.id),
  ]);
  const festIds = [...new Set((rows || []).map((r) => (r.submission as unknown as { festival_id: string })?.festival_id).filter(Boolean))];
  const { data: crit } = festIds.length ? await sb.from('criteria').select('id,name,weight,festival_id,sort').in('festival_id', festIds).order('sort') : { data: [] };
  const { data: mine } = await sb.from('reviews').select('submission_id,scores,notes,total').eq('reviewer_id', user.id);
  const films = (rows || []).map((r) => {
    const s = r.submission as unknown as Record<string, unknown> & { id: string; festival_id: string; screener_url: string | null; screener_path: string | null; analysis: unknown; category: unknown; festival: unknown };
    const one = <T,>(x: unknown) => (Array.isArray(x) ? x[0] : x) as T;
    return { ...s, status: r.status, due_at: (r as { due_at?: string | null }).due_at || null, analysis: one(s.analysis), category: one<{ name: string } | null>(s.category)?.name || null, festival: one<{ name: string; review_deadline: string | null }>(s.festival),
      embed: embedUrl(s.screener_url), hasFile: !!s.screener_path, review: (mine || []).find((m) => m.submission_id === s.id) || null };
  });
  const isStaff = (mems || []).some((m) => m.role !== 'reviewer');
  return <ReviewDesk name={prof?.full_name || prof?.email?.split('@')[0] || ''} films={films as never} criteria={(crit || []) as never} isStaff={isStaff} />;
}
