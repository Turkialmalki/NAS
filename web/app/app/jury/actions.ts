'use server';
import { revalidatePath } from 'next/cache';
import { requireStaff, log } from '@/lib/ctx';

export async function assignMany(pairs: { s: string; r: string }[]) {
  const { sb, festival, user, name } = await requireStaff();
  if (!pairs.length) return { ok: true };
  const { error } = await sb.from('assignments').upsert(pairs.map((p) => ({ submission_id: p.s, reviewer_id: p.r })), { onConflict: 'submission_id,reviewer_id', ignoreDuplicates: true });
  if (error) return { ok: false, error: error.message };
  await log(sb, festival.id, user.id, name, 'توزيع', `${pairs.length} أفلام`);
  revalidatePath('/app', 'layout');
  return { ok: true };
}

export async function invite(fd: FormData) {
  const { sb, festival, user, name } = await requireStaff();
  const email = String(fd.get('email') || '').trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: 'اكتب بريدًا صحيحًا.' };
  const { data, error } = await sb.rpc('invite_member', { p_festival: festival.id, p_email: email, p_role: String(fd.get('role') || 'reviewer'), p_specialty: String(fd.get('specialty') || '') || null });
  if (error) return { ok: false, error: error.message };
  await log(sb, festival.id, user.id, name, 'دعوة عضو', email);
  revalidatePath('/app', 'layout');
  return { ok: true, state: data as string };
}

export async function removeMember(userId: string) {
  const { sb, festival, user } = await requireStaff();
  if (userId === user.id) return { ok: false, error: 'لا يمكنك إزالة نفسك.' };
  const { error } = await sb.from('festival_members').delete().eq('festival_id', festival.id).eq('user_id', userId).neq('role', 'owner');
  revalidatePath('/app', 'layout');
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function cancelInvite(id: string) {
  const { sb } = await requireStaff();
  await sb.from('festival_invites').delete().eq('id', id);
  revalidatePath('/app', 'layout');
  return { ok: true };
}
