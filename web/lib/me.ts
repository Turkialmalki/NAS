import type { SupabaseClient } from '@supabase/supabase-js';
import { recommend, completeness, type RecFestival } from './recommend';

export type MyFilm = {
  id: string; title: string; director: string | null; genre: string | null; duration_min: number | null; synopsis: string | null; language: string | null; country: string | null;
  screener_url: string | null; screener_path: string | null; updated_at: string; poster: string | null; score: number | null; themes: string[]; pct: number; missing: string[];
};
export type MySub = { id: string; ref_code: string; title: string; project_id: string | null; festival: string; festival_slug: string; category: string | null; stage: 'submitted' | 'review' | 'decided'; result: 'selected' | 'not_selected' | null; created_at: string; results_on: string | null };

/** Everything the filmmaker home needs, in one round of parallel queries. */
export async function loadMe(sb: SupabaseClient) {
  const [{ data: films }, { data: subs }, { data: fests }] = await Promise.all([
    sb.from('projects').select('id,title,director,genre,duration_min,synopsis,language,country,screener_url,screener_path,updated_at,poster:video->scenes->2->>thumb,poster0:video->scenes->0->>thumb,score:video->score,themes:video->themes')
      .order('updated_at', { ascending: false }),
    sb.rpc('my_submissions'),
    sb.rpc('open_festivals'),
  ]);
  const myFilms: MyFilm[] = (films || []).map((f) => {
    const x = f as unknown as Record<string, unknown>;
    const c = completeness({ ...(x as object), has_video: x.score != null } as Parameters<typeof completeness>[0]);
    return { ...(x as unknown as MyFilm), poster: (x.poster as string) || (x.poster0 as string) || null, score: x.score != null ? Number(x.score) : null, themes: (x.themes as string[]) || [], pct: c.pct, missing: c.missing };
  });
  const mySubs = (subs || []) as MySub[];
  const festivals = (fests || []) as (RecFestival & { results_on: string | null; starts_on: string | null; films: number })[];
  const done = new Set(mySubs.map((s) => `${s.project_id}:${festivals.find((f) => f.name === s.festival)?.id}`));
  const recs = recommend(myFilms.map((f) => ({ id: f.id, title: f.title, genre: f.genre, duration_min: f.duration_min, themes: f.themes })), festivals, done);
  return { films: myFilms, subs: mySubs, festivals, recs };
}
