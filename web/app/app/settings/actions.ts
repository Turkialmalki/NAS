'use server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { requireStaff, log } from '@/lib/ctx';

const ok = () => { revalidatePath('/app', 'layout'); return { ok: true as const }; };
const s = (fd: FormData, k: string) => { const v = String(fd.get(k) ?? '').trim(); return v || null; };

export async function updateFestival(fd: FormData) {
  const { sb, festival, user, name } = await requireStaff();
  const rules = String(fd.get('rules') || '').split('\n').map((x) => x.trim()).filter(Boolean);
  const { error } = await sb.from('festivals').update({
    name: s(fd, 'name') || festival.name, slug: s(fd, 'slug') || festival.slug, description: s(fd, 'description'), city: s(fd, 'city'),
    submissions_open: s(fd, 'open'), submissions_close: s(fd, 'close'), review_deadline: s(fd, 'review'), results_on: s(fd, 'results'), rules,
  }).eq('id', festival.id);
  if (error) return { ok: false as const, error: /slug/.test(error.message) ? 'رابط الصفحة مستخدم أو غير صالح (حروف إنجليزية صغيرة وأرقام وشرطات).' : error.message };
  await log(sb, festival.id, user.id, name, 'تحديث الإعدادات', festival.name);
  return ok();
}

export async function setPublished(open: boolean) {
  const { sb, festival } = await requireStaff();
  const { error } = await sb.from('festivals').update({ status: open ? 'open' : 'closed' }).eq('id', festival.id);
  return error ? { ok: false as const, error: error.message } : ok();
}

export async function saveCategory(fd: FormData) {
  const { sb, festival } = await requireStaff();
  const id = s(fd, 'id');
  const row = { festival_id: festival.id, name: s(fd, 'name') || 'قسم جديد', description: s(fd, 'description'), fee: s(fd, 'fee') };
  const { error } = id ? await sb.from('categories').update(row).eq('id', id) : await sb.from('categories').insert({ ...row, sort: 99 });
  return error ? { ok: false as const, error: error.message } : ok();
}
export async function deleteCategory(id: string) {
  const { sb } = await requireStaff();
  const { error } = await sb.from('categories').delete().eq('id', id);
  return error ? { ok: false as const, error: error.message } : ok();
}
export async function saveCriteria(list: { id?: string; name: string; weight: number }[]) {
  const { sb, festival } = await requireStaff();
  const { data: cur } = await sb.from('criteria').select('id').eq('festival_id', festival.id);
  const keep = new Set(list.filter((c) => c.id).map((c) => c.id));
  const del = (cur || []).filter((c) => !keep.has(c.id)).map((c) => c.id);
  if (del.length) await sb.from('criteria').delete().in('id', del);
  for (const [i, c] of list.entries()) {
    const row = { festival_id: festival.id, name: c.name, weight: Math.max(1, Math.round(c.weight)), sort: i };
    const { error } = c.id ? await sb.from('criteria').update(row).eq('id', c.id) : await sb.from('criteria').insert(row);
    if (error) return { ok: false as const, error: error.message };
  }
  return ok();
}
export async function duplicate() {
  const { sb, festival } = await requireStaff();
  const { data, error } = await sb.rpc('duplicate_festival', { p_festival: festival.id });
  if (error) return { ok: false as const, error: error.message };
  (await cookies()).set('nas_fid', data as string, { path: '/', maxAge: 31536000 });
  return ok();
}
