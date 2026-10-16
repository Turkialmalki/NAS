import type { SupabaseClient } from '@supabase/supabase-js';
import type { VideoAnalysis } from './videoAnalysis';

export type FilmRow = {
  id: string; ref_code: string; title: string; director_name: string; email: string; genre: string | null; duration_min: number | null; country: string | null; language: string | null;
  synopsis: string | null; screener_url: string | null; screener_path: string | null; status: string; decision: string; decision_published: boolean; created_at: string; category_id: string | null;
  analysis: { score: number | null; headline: string | null; themes: string[]; tone: string[]; fit: { category: string; pct: number }[]; checks: { ok: boolean; text: string }[]; strengths: string[]; suggested_reviewer: string | null; model: string | null; video: VideoAnalysis | null } | null;
  assignments: { reviewer_id: string; status: string }[];
  reviews: { reviewer_id: string; total: number | null; notes: string | null }[];
};
export type Person = { user_id: string; name: string; email: string | null; role: string; specialty: string | null };

export async function loadFilms(sb: SupabaseClient, festivalId: string) {
  const { data } = await sb.from('submissions')
    .select('id,ref_code,title,director_name,email,genre,duration_min,country,language,synopsis,screener_url,screener_path,status,decision,decision_published,created_at,category_id,analyses(score,headline,themes,tone,fit,checks,strengths,suggested_reviewer,model,video),assignments(reviewer_id,status),reviews(reviewer_id,total,notes)')
    .eq('festival_id', festivalId).order('created_at', { ascending: false });
  return (data || []).map((s) => {
    const a = s.analyses as unknown;
    return { ...s, analysis: (Array.isArray(a) ? a[0] : a) || null } as unknown as FilmRow;
  });
}

export async function loadPeople(sb: SupabaseClient, festivalId: string): Promise<Person[]> {
  const { data } = await sb.from('festival_members').select('user_id,role,specialty,profiles:profiles!inner(full_name,email)').eq('festival_id', festivalId);
  return (data || []).map((m) => {
    const p = (Array.isArray(m.profiles) ? m.profiles[0] : m.profiles) as { full_name: string | null; email: string | null } | null;
    return { user_id: m.user_id, role: m.role, specialty: m.specialty, email: p?.email || null, name: p?.full_name || p?.email?.split('@')[0] || 'عضو' };
  });
}
