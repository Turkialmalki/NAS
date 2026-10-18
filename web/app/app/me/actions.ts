'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { sessionUser } from '@/lib/ctx';
import { verifyReport, type VideoAnalysis } from '@/lib/videoAnalysis';
import { runAnalysis } from '@/lib/runAnalysis';
import { sendEmail, wrapEmail } from '@/lib/email';

type Res = { ok: boolean; error?: string; id?: string; ref?: string };

export type ProjectInput = {
  id?: string; title: string; director: string; synopsis: string; logline?: string; genre: string; duration_min: number | null; language: string; country: string; year: number | null;
  screener_url: string | null; screener_path: string | null; video?: VideoAnalysis | null; video_sig?: string | null;
};

export async function saveProject(p: ProjectInput): Promise<Res> {
  const user = await sessionUser();
  if (!user) return { ok: false, error: 'auth' };
  if (!p.title?.trim()) return { ok: false, error: 'title' };
  if (p.duration_min != null && !(p.duration_min >= 1 && p.duration_min <= 600)) return { ok: false, error: 'duration' };
  if (p.screener_url && !/^https?:\/\/\S+\.\S{2,}/i.test(p.screener_url)) return { ok: false, error: 'url' };
  if (p.screener_path && !p.screener_path.startsWith(`projects/${user.id}/`)) return { ok: false, error: 'path' };
  const sb = await supabaseServer();
  const row: Record<string, unknown> = {
    title: p.title.trim().slice(0, 200), director: p.director?.trim().slice(0, 200) || null, synopsis: p.synopsis?.trim().slice(0, 2000) || null, logline: p.logline?.trim().slice(0, 300) || null,
    genre: p.genre || null, duration_min: p.duration_min, language: p.language || null, country: p.country || null, year: p.year, screener_url: p.screener_url || null, screener_path: p.screener_path || null,
    updated_at: new Date().toISOString(),
  };
  // only keep a film report the server itself signed
  if (p.video !== undefined) {
    if (p.video && p.video_sig && verifyReport(p.video, p.video_sig)) { row.video = p.video; row.video_sig = p.video_sig; }
    else if (p.video === null) { row.video = null; row.video_sig = null; }
  }
  if (p.id) {
    const { error } = await sb.from('projects').update(row).eq('id', p.id).eq('owner_id', user.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath('/app/me', 'layout');
    return { ok: true, id: p.id };
  }
  const { data, error } = await sb.from('projects').insert({ ...row, owner_id: user.id }).select('id').single();
  if (error || !data) return { ok: false, error: error?.message };
  revalidatePath('/app/me', 'layout');
  return { ok: true, id: data.id };
}

export async function deleteProject(id: string): Promise<Res> {
  const user = await sessionUser();
  if (!user) return { ok: false, error: 'auth' };
  const sb = await supabaseServer();
  const { error } = await sb.from('projects').delete().eq('id', id).eq('owner_id', user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/app/me', 'layout');
  return { ok: true };
}

/** Submit one of my films to a festival; the festival receives it already analysed. */
export async function submitProject(projectId: string, festivalId: string, categoryId: string | null): Promise<Res> {
  const user = await sessionUser();
  if (!user) return { ok: false, error: 'auth' };
  const sb = await supabaseServer();
  const { data, error } = await sb.rpc('submit_project', { p_project: projectId, p_festival: festivalId, p_category: categoryId });
  if (error || !data?.[0]) {
    const m = error?.message || '';
    return { ok: false, error: /duplicate/.test(m) ? 'duplicate' : /festival_closed/.test(m) ? 'closed' : /no_screener/.test(m) ? 'no_screener' : 'failed' };
  }
  const row = data[0] as { id: string; ref_code: string; analysis_token: string };
  const { data: pr } = await sb.from('projects').select('*').eq('id', projectId).single();
  const { data: f } = await sb.rpc('open_festivals');
  const fest = (f || []).find((x: { id: string }) => x.id === festivalId) as { name: string } | undefined;
  const video = pr?.video && pr.video_sig && verifyReport(pr.video, pr.video_sig) ? (pr.video as VideoAnalysis) : null;
  try {
    await runAnalysis(sb, { id: row.id, analysis_token: row.analysis_token, festival_id: festivalId, category_id: categoryId, title: pr?.title || '', synopsis: pr?.synopsis || '',
      genre: pr?.genre || null, duration_min: pr?.duration_min || null, language: pr?.language || null, country: pr?.country || null, screener_url: pr?.screener_url || null }, video);
  } catch (e) { console.error('analysis failed', e); }
  if (user.email) {
    await sendEmail(user.email, `وصلت مشاركتك · ${row.ref_code}`, wrapEmail(
      `<h2 style="margin:0 0 10px">وصل فيلمك «${String(pr?.title || '').replace(/</g, '')}» إلى ${String(fest?.name || '').replace(/</g, '')}</h2>
       <p style="color:#A1A1A6;line-height:1.8">رقمك المرجعي:</p><p style="font-size:24px;font-weight:700;direction:ltr;text-align:right">${row.ref_code}</p>
       <a href="${process.env.NEXT_PUBLIC_SITE_URL || ''}/app/me" style="display:inline-block;background:#C9A84C;color:#0A0A0A;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:700">تابع مشاركاتك</a>`));
  }
  revalidatePath('/app/me', 'layout');
  return { ok: true, ref: row.ref_code };
}
