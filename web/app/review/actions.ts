'use server';
import { revalidatePath } from 'next/cache';
import { supabaseServer } from '@/lib/supabase/server';

export async function startWatching(submissionId: string) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;
  await sb.from('assignments').update({ status: 'in_progress' }).eq('submission_id', submissionId).eq('reviewer_id', user.id).eq('status', 'assigned');
}

export async function submitReview(submissionId: string, scores: Record<string, number>, total: number, notes: string) {
  const sb = await supabaseServer();
  const { error } = await sb.rpc('submit_review', { p_submission: submissionId, p_scores: scores, p_total: total, p_notes: notes });
  revalidatePath('/review');
  return error ? { ok: false, error: error.message } : { ok: true };
}
