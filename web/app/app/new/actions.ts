'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';

export async function createFestival(fd: FormData) {
  const sb = await supabaseServer();
  const g = (k: string) => { const v = String(fd.get(k) ?? '').trim(); return v || null; };
  const slug = (g('slug') || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  if (!g('name') || slug.length < 3) return { ok: false, error: 'اكتب اسم المهرجان ورابطًا بالحروف الإنجليزية (٣ أحرف على الأقل).' };
  const { data, error } = await sb.rpc('create_festival', {
    p_name: g('name'), p_slug: slug, p_city: g('city'), p_country: g('country'), p_description: g('description'),
    p_open: g('open'), p_close: g('close'), p_review: g('review'), p_results: g('results'), p_status: g('status') || 'draft', p_visibility: g('visibility') || 'public', p_copy_from: g('copy'),
  });
  if (error) return { ok: false, error: /duplicate|unique/.test(error.message) ? 'رابط الصفحة مستخدم، اختر رابطًا آخر.' : error.message };
  (await cookies()).set('nas_fid', data as string, { path: '/', maxAge: 31536000 });
  redirect('/app');
}
