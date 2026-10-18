import { durationRule } from './rules';

export type RecFilm = { id: string; title: string; genre: string | null; duration_min: number | null; themes?: string[] };
export type RecFestival = { id: string; name: string; slug: string; city: string | null; country: string | null; submissions_close: string | null; fee_note: string | null; description?: string | null;
  categories: { id: string; name: string; description: string | null; fee: string | null }[] };
export type Rec = { festival: RecFestival; film: RecFilm; categoryId: string | null; categoryName: string | null; pct: number; reasons: { k: string; v?: Record<string, string | number> }[] };

/** Best category of a festival for a film, with a 0–100 fit. */
export function bestCategory(film: RecFilm, fest: RecFestival) {
  let best: { id: string | null; name: string | null; pct: number; durOk: boolean | null } = { id: null, name: null, pct: 40, durOk: null };
  for (const c of fest.categories) {
    let pct = 45; let durOk: boolean | null = null;
    const r = durationRule(c.description);
    const d = film.duration_min || 0;
    if (d && (r.max != null || r.min != null)) { durOk = (r.max == null || d <= r.max) && (r.min == null || d >= r.min); pct += durOk ? 30 : -45; }
    if (film.genre && (c.name.includes(film.genre) || (film.genre === 'وثائقي' && /وثائق/.test(c.name)) || (film.genre === 'تحريك' && /تحريك|رسوم/.test(c.name)))) pct += 25;
    if (/الأول|first/i.test(c.name)) pct -= 10;
    if (pct > best.pct) best = { id: c.id, name: c.name, pct, durOk };
  }
  return { ...best, pct: Math.max(5, Math.min(98, best.pct)) };
}

/** Festivals that suit the filmmaker's films, best first, with plain reasons. */
export function recommend(films: RecFilm[], fests: RecFestival[], submitted: Set<string>, limit = 6): Rec[] {
  const out: Rec[] = [];
  for (const fest of fests) {
    let top: Rec | null = null;
    for (const film of films) {
      if (submitted.has(`${film.id}:${fest.id}`)) continue;
      const b = bestCategory(film, fest);
      let pct = b.pct;
      const reasons: Rec['reasons'] = [];
      if (b.durOk) reasons.push({ k: 'مدة «{film}» تناسب قسم «{cat}»', v: { film: film.title, cat: b.name || '' } });
      else if (b.name) reasons.push({ k: 'قسم «{cat}» قريب من فيلمك', v: { cat: b.name } });
      const days = fest.submissions_close ? Math.ceil((new Date(fest.submissions_close).getTime() - Date.now()) / 86400000) : null;
      if (days != null && days <= 14) { reasons.push({ k: 'يغلق التقديم بعد {n} يومًا', v: { n: Math.max(0, days) } }); pct += 4; }
      if (/مجان|free/i.test(`${fest.fee_note} ${fest.categories.map((c) => c.fee).join(' ')}`)) { reasons.push({ k: 'التقديم مجاني' }); pct += 3; }
      if (fest.country === 'السعودية') pct += 2;
      if (!top || pct > top.pct) top = { festival: fest, film, categoryId: b.id, categoryName: b.name, pct: Math.min(98, pct), reasons: reasons.slice(0, 3) };
    }
    if (top && top.pct >= 50) out.push(top);
  }
  return out.sort((a, b) => b.pct - a.pct).slice(0, limit);
}

/** How complete a film file is, for the readiness ring. */
export function completeness(p: { title?: string | null; director?: string | null; synopsis?: string | null; genre?: string | null; duration_min?: number | null; language?: string | null; country?: string | null; screener_url?: string | null; screener_path?: string | null; has_video?: boolean }) {
  const parts: [boolean, string][] = [
    [!!p.title, 'العنوان'], [!!p.director, 'اسم المخرج'], [(p.synopsis || '').length >= 40, 'ملخص واضح'], [!!p.genre, 'النوع'], [!!p.duration_min, 'المدة'],
    [!!p.language, 'اللغة'], [!!p.country, 'بلد الإنتاج'], [!!(p.screener_url || p.screener_path), 'نسخة المشاهدة'], [!!p.has_video, 'تحليل NAS Vision'],
  ];
  return { pct: Math.round((parts.filter(([ok]) => ok).length / parts.length) * 100), missing: parts.filter(([ok]) => !ok).map(([, l]) => l) };
}
