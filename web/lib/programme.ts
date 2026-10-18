// Festival programme helpers. Times are kept in Riyadh time (UTC+3, no DST) so the
// schedule reads the same on the server, in the browser and on the public page.
export const TZ_OFFSET = 3 * 60;
export type Venue = { id: string; name: string; capacity: number | null };
export type Screening = { id: string; submission_id: string; venue_id: string; starts_at: string; duration_min: number; title?: string };
export type Film = { id: string; title: string; duration_min: number | null; genre: string | null; category: string | null; score: number | null };

/** "2026-11-05" + minutes from midnight → ISO instant. */
export const toIso = (day: string, min: number) => new Date(Date.parse(`${day}T00:00:00Z`) + (min - TZ_OFFSET) * 60000).toISOString();
/** ISO instant → Riyadh day + minutes from midnight. */
export function local(iso: string) {
  const d = new Date(Date.parse(iso) + TZ_OFFSET * 60000);
  return { day: d.toISOString().slice(0, 10), min: d.getUTCHours() * 60 + d.getUTCMinutes() };
}
export const hhmm = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
export const parseHhmm = (s: string) => { const m = s.match(/^(\d{1,2}):(\d{2})$/); return m ? +m[1] * 60 + +m[2] : null; };

export function festivalDays(start?: string | null, end?: string | null) {
  const today = new Date(Date.now() + TZ_OFFSET * 60000).toISOString().slice(0, 10);
  const a = start || today; let b = end || start || today;
  if (b < a) b = a;
  const out: string[] = [];
  for (let x = Date.parse(`${a}T00:00:00Z`); x <= Date.parse(`${b}T00:00:00Z`) && out.length < 21; x += 86400000) out.push(new Date(x).toISOString().slice(0, 10));
  if (!start && !end) { const d0 = Date.parse(`${a}T00:00:00Z`); for (let i = 1; i < 3; i++) out.push(new Date(d0 + i * 86400000).toISOString().slice(0, 10)); }
  return out;
}

export const BUFFER = 15; // minutes between screenings in one venue (seating + Q&A turnover)

/** Screenings in the same venue that overlap (including the turnover buffer). */
export function conflictsFor(s: Pick<Screening, 'venue_id' | 'starts_at' | 'duration_min'> & { id?: string }, all: Screening[]) {
  const a0 = Date.parse(s.starts_at), a1 = a0 + (s.duration_min + BUFFER) * 60000;
  return all.filter((x) => x.id !== s.id && x.venue_id === s.venue_id && (() => { const b0 = Date.parse(x.starts_at), b1 = b0 + (x.duration_min + BUFFER) * 60000; return a0 < b1 && b0 < a1; })());
}

/** First free start time ≥ from in a venue/day. */
export function nextFree(venue: string, day: string, dur: number, all: Screening[], from = 16 * 60, until = 24 * 60) {
  for (let m = from; m + dur <= until; m += 5) {
    const iso = toIso(day, m);
    if (!conflictsFor({ venue_id: venue, starts_at: iso, duration_min: dur }, all).length) return m;
  }
  return null;
}

/**
 * Proposes a full programme for the films not yet scheduled. Films of one category are
 * kept together (so a "shorts block" plays as a block), stronger films are placed first,
 * and screenings are spread evenly over the days and venues.
 */
export function autoSchedule(films: Film[], venues: Venue[], days: string[], existing: Screening[]) {
  const plan: Screening[] = [];
  if (!venues.length || !days.length) return { plan, left: films };
  const groups = new Map<string, Film[]>();
  for (const f of films) { const k = f.category || f.genre || '—'; groups.set(k, [...(groups.get(k) || []), f]); }
  const queue = [...groups.values()].sort((a, b) => b.length - a.length)
    .flatMap((g) => g.sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0)));
  const all = [...existing];
  const left: Film[] = [];
  let slot = 0;
  for (const f of queue) {
    const dur = Math.max(1, f.duration_min || 20);
    let placed = false;
    for (let k = 0; k < days.length * venues.length && !placed; k++) {
      const idx = (slot + k) % (days.length * venues.length);
      const day = days[Math.floor(idx / venues.length)], v = venues[idx % venues.length];
      const m = nextFree(v.id, day, dur, all);
      if (m != null) {
        const s: Screening = { id: `new-${f.id}`, submission_id: f.id, venue_id: v.id, starts_at: toIso(day, m), duration_min: dur, title: f.title };
        plan.push(s); all.push(s); placed = true; slot = idx + 1;
      }
    }
    if (!placed) left.push(f);
  }
  return { plan, left };
}
