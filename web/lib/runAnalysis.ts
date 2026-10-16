import type { SupabaseClient } from '@supabase/supabase-js';
import { analyzeFilm, type Category, type Reviewer } from './analyze';

/** Runs the analysis for a submission and saves it through the token-guarded RPC. */
export async function runAnalysis(sb: SupabaseClient, sub: { id: string; analysis_token: string; festival_id: string; category_id: string | null;
  title: string; synopsis: string | null; genre: string | null; duration_min: number | null; language: string | null; country: string | null; screener_url: string | null }) {
  const [{ data: cats }, { data: pool }] = await Promise.all([
    sb.from('categories').select('id,name,description').eq('festival_id', sub.festival_id).order('sort'),
    sb.rpc('reviewer_pool', { p_submission: sub.id, p_token: sub.analysis_token }),
  ]);
  const a = await analyzeFilm({ ...sub, synopsis: sub.synopsis || '' }, (cats || []) as Category[], (pool || []) as Reviewer[]);
  const { error } = await sb.rpc('save_analysis', { p_submission: sub.id, p_token: sub.analysis_token, p: a });
  if (error) throw error;
  return a;
}
