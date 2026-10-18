'use server';
import { revalidatePath } from 'next/cache';
import { requireStaff, log } from '@/lib/ctx';
import { conflictsFor, type Screening } from '@/lib/programme';

type R = { ok: boolean; error?: string };
const done = () => { revalidatePath('/app/programme'); revalidatePath('/app'); };

export async function addVenue(name: string, capacity: number | null): Promise<R> {
  const { sb, festival } = await requireStaff();
  const n = name.trim();
  if (n.length < 2 || n.length > 80) return { ok: false, error: 'invalid' };
  if (capacity != null && (!Number.isInteger(capacity) || capacity < 1 || capacity > 100000)) return { ok: false, error: 'invalid' };
  const { count } = await sb.from('venues').select('id', { count: 'exact', head: true }).eq('festival_id', festival.id);
  const { error } = await sb.from('venues').insert({ festival_id: festival.id, name: n, capacity, sort: count || 0 });
  if (error) return { ok: false, error: 'failed' };
  done(); return { ok: true };
}

export async function deleteVenue(id: string): Promise<R> {
  const { sb, festival } = await requireStaff();
  const { error } = await sb.from('venues').delete().eq('id', id).eq('festival_id', festival.id);
  if (error) return { ok: false, error: 'failed' };
  done(); return { ok: true };
}

/** Saves one or many screenings; refuses the whole batch if any of them clash. */
export async function saveScreenings(items: { id?: string; submission_id: string; venue_id: string; starts_at: string; duration_min: number }[]): Promise<R & { clash?: string }> {
  const { sb, festival, user, name } = await requireStaff();
  if (!items.length || items.length > 300) return { ok: false, error: 'invalid' };
  for (const i of items) if (!Date.parse(i.starts_at) || !(i.duration_min >= 1 && i.duration_min <= 600)) return { ok: false, error: 'invalid' };
  const [{ data: ex }, { data: films }, { data: vs }] = await Promise.all([
    sb.from('screenings').select('id,submission_id,venue_id,starts_at,duration_min').eq('festival_id', festival.id),
    sb.from('submissions').select('id,title').eq('festival_id', festival.id).in('id', [...new Set(items.map((i) => i.submission_id))]),
    sb.from('venues').select('id').eq('festival_id', festival.id),
  ]);
  const okFilm = new Set((films || []).map((f) => f.id)), okVenue = new Set((vs || []).map((v) => v.id));
  if (items.some((i) => !okFilm.has(i.submission_id) || !okVenue.has(i.venue_id))) return { ok: false, error: 'invalid' };
  const editing = new Set(items.filter((i) => i.id).map((i) => i.id));
  const all: Screening[] = [...(ex || []).filter((x) => !editing.has(x.id)) as Screening[]];
  for (const i of items) {
    const c = conflictsFor({ ...i, id: i.id || 'x' }, all);
    if (c.length) return { ok: false, error: 'clash', clash: (films || []).find((f) => f.id === c[0].submission_id)?.title || '' };
    all.push({ ...i, id: i.id || `n${all.length}` } as Screening);
  }
  const rows = items.map((i) => ({ ...(i.id ? { id: i.id } : {}), festival_id: festival.id, submission_id: i.submission_id, venue_id: i.venue_id, starts_at: i.starts_at, duration_min: i.duration_min }));
  const ins = rows.filter((r) => !('id' in r)), upd = rows.filter((r) => 'id' in r);
  if (ins.length) { const { error } = await sb.from('screenings').insert(ins); if (error) return { ok: false, error: 'failed' }; }
  for (const u of upd) { const { error } = await sb.from('screenings').update(u).eq('id', (u as { id: string }).id).eq('festival_id', festival.id); if (error) return { ok: false, error: 'failed' }; }
  await log(sb, festival.id, user.id, name, 'جدولة', items.length > 1 ? `${items.length} عروض` : (films || [])[0]?.title || '');
  done(); return { ok: true };
}

export async function deleteScreening(id: string): Promise<R> {
  const { sb, festival } = await requireStaff();
  const { error } = await sb.from('screenings').delete().eq('id', id).eq('festival_id', festival.id);
  if (error) return { ok: false, error: 'failed' };
  done(); return { ok: true };
}

export async function setProgrammePublished(on: boolean): Promise<R> {
  const { sb, festival, user, name } = await requireStaff();
  const { error } = await sb.from('festivals').update({ programme_published: on }).eq('id', festival.id);
  if (error) return { ok: false, error: 'failed' };
  await log(sb, festival.id, user.id, name, on ? 'نشر البرنامج' : 'إخفاء البرنامج', '');
  revalidatePath(`/f/${festival.slug}`); done(); return { ok: true };
}
