'use server';
import { cookies } from 'next/headers';
import { supabaseServer } from '@/lib/supabase/server';
import { sessionUser } from '@/lib/ctx';

export type NewFestival = {
  name: string; slug: string; city: string; country: string; description: string;
  starts_on: string; ends_on: string; submissions_open: string; submissions_close: string; review_deadline: string; results_on: string;
  fee_note: string; rules: string[]; categories: { name: string; description: string; fee: string }[]; criteria: { name: string; weight: number }[];
  status: 'draft' | 'open'; visibility: 'public' | 'private'; source: 'file' | 'manual';
};

export async function createFestivalFull(p: NewFestival): Promise<{ ok: boolean; error?: string; slug?: string }> {
  if (!(await sessionUser())) return { ok: false, error: 'سجّل الدخول أولًا.' };
  if (!p.name?.trim() || p.name.trim().length < 3) return { ok: false, error: 'اكتب اسم المهرجان (٣ أحرف على الأقل).' };
  const sb = await supabaseServer();
  const { data, error } = await sb.rpc('create_festival_full', { p });
  if (error) return { ok: false, error: /date/i.test(error.message) ? 'تحقق من التواريخ.' : 'تعذّر إنشاء المهرجان. حاول مرة أخرى.' };
  (await cookies()).set('nas_fid', data as string, { path: '/', maxAge: 31536000, sameSite: 'lax' });
  const { data: f } = await sb.from('festivals').select('slug').eq('id', data as string).single();
  return { ok: true, slug: f?.slug };
}
