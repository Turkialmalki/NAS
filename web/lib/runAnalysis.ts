import type { SupabaseClient } from '@supabase/supabase-js';
import { analyzeFilm, type Category, type Reviewer } from './analyze';
import { blendScore, type VideoAnalysis } from './videoAnalysis';

/** Runs the analysis for a submission and saves it through the token-guarded RPC.
 *  When a NAS Vision report exists, it is folded into the score, themes and checks. */
export async function runAnalysis(sb: SupabaseClient, sub: { id: string; analysis_token: string; festival_id: string; category_id: string | null;
  title: string; synopsis: string | null; genre: string | null; duration_min: number | null; language: string | null; country: string | null; screener_url: string | null },
  video?: VideoAnalysis | null) {
  const [{ data: cats }, { data: pool }] = await Promise.all([
    sb.from('categories').select('id,name,description').eq('festival_id', sub.festival_id).order('sort'),
    sb.rpc('reviewer_pool', { p_submission: sub.id, p_token: sub.analysis_token }),
  ]);
  const a = await analyzeFilm({ ...sub, synopsis: sub.synopsis || video?.synopsis_draft || '' }, (cats || []) as Category[], (pool || []) as Reviewer[]);
  if (video) {
    a.score = blendScore(a.score, video.score);
    if (!/builtin/.test(video.model)) a.headline = video.headline;
    a.themes = [...new Set([...a.themes, ...video.themes])].slice(0, 3);
    a.tone = [...new Set([...a.tone, ...video.mood])].slice(0, 2);
    a.checks = [...video.checks.slice(0, 2), ...a.checks.filter((c) => !/المدة/.test(c.text))].slice(0, 5);
    a.model = `${a.model} + ${video.model}`;
  }
  const { error } = await sb.rpc('save_analysis', { p_submission: sub.id, p_token: sub.analysis_token, p: a });
  if (error) throw error;
  if (video) {
    const { error: e2 } = await sb.rpc('save_video_analysis', { p_submission: sub.id, p_token: sub.analysis_token, p: video, p_score: null });
    if (e2) console.error('save video analysis failed', e2);
  }
  return a;
}
