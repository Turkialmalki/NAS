import { NextResponse } from 'next/server';
import { supabaseAnon } from '@/lib/supabase/server';
import { runAnalysis } from '@/lib/runAnalysis';
import { sendEmail, wrapEmail } from '@/lib/email';

export const maxDuration = 60;

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  const sb = supabaseAnon();
  const { data, error } = await sb.rpc('submit_film', {
    p_festival: b.festival_id, p_category: b.category_id || null, p_title: b.title, p_director: b.director, p_email: b.email,
    p_duration: b.duration ? Number(b.duration) : null, p_genre: b.genre || null, p_language: b.language || null, p_country: b.country || null,
    p_synopsis: b.synopsis || '', p_screener_url: b.screener_url || null, p_screener_path: b.screener_path || null,
  });
  if (error || !data?.[0]) {
    const msg = error?.message || '';
    return NextResponse.json({ error: msg.includes('festival_closed') ? 'festival_closed' : msg.includes('invalid_input') ? 'invalid_input' : 'failed' }, { status: 400 });
  }
  const row = data[0] as { id: string; ref_code: string; analysis_token: string };
  let checks: { ok: boolean; text: string }[] = [];
  try {
    const a = await runAnalysis(sb, { id: row.id, analysis_token: row.analysis_token, festival_id: b.festival_id, category_id: b.category_id || null, title: b.title,
      synopsis: b.synopsis || '', genre: b.genre || null, duration_min: b.duration ? Number(b.duration) : null, language: b.language || null, country: b.country || null, screener_url: b.screener_url || null });
    checks = a.checks;
  } catch (e) { console.error('analysis failed', e); }
  await sendEmail(b.email, `وصلت مشاركتك · ${row.ref_code}`, wrapEmail(
    `<h2 style="margin:0 0 10px">وصلت مشاركتك «${String(b.title).replace(/</g, '')}»</h2><p style="color:#A1A1A6;line-height:1.8">رقمك المرجعي:</p>
     <p style="font-size:24px;font-weight:700;direction:ltr;text-align:right">${row.ref_code}</p>
     <p style="color:#A1A1A6;line-height:1.8">تابع حالة مشاركتك في أي وقت من صفحة «تابع مشاركتك».</p>
     <a href="${process.env.NEXT_PUBLIC_SITE_URL || ''}/status?ref=${row.ref_code}" style="display:inline-block;background:#C9A84C;color:#0A0A0A;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:700">تابع مشاركتك</a>`));
  return NextResponse.json({ ref_code: row.ref_code, checks });
}
