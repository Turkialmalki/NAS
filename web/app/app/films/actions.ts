'use server';
import { revalidatePath } from 'next/cache';
import { requireStaff, log } from '@/lib/ctx';
import { runAnalysis } from '@/lib/runAnalysis';
import { sendEmail, wrapEmail } from '@/lib/email';

type Res = { ok: boolean; error?: string };
const done = (): Res => { revalidatePath('/app', 'layout'); return { ok: true }; };

export async function setDecision(id: string, decision: string): Promise<Res> {
  const { sb, user, name } = await requireStaff();
  const { data, error } = await sb.from('submissions').update({ decision }).eq('id', id).select('ref_code,festival_id').single();
  if (error) return { ok: false, error: error.message };
  await log(sb, data.festival_id, user.id, name, 'قرار', `${data.ref_code} · ${decision}`);
  return done();
}

export async function setStatus(id: string, status: string): Promise<Res> {
  const { sb } = await requireStaff();
  const { error } = await sb.from('submissions').update({ status }).eq('id', id);
  return error ? { ok: false, error: error.message } : done();
}

export async function assign(id: string, reviewerId: string): Promise<Res> {
  const { sb, user, name, festival } = await requireStaff();
  const { error } = await sb.from('assignments').upsert({ submission_id: id, reviewer_id: reviewerId }, { onConflict: 'submission_id,reviewer_id', ignoreDuplicates: true });
  if (error) return { ok: false, error: error.message };
  const { data: s } = await sb.from('submissions').select('ref_code').eq('id', id).single();
  await log(sb, festival.id, user.id, name, 'إسناد', s?.ref_code || '');
  return done();
}

export async function unassign(id: string, reviewerId: string): Promise<Res> {
  const { sb } = await requireStaff();
  const { error } = await sb.from('assignments').delete().eq('submission_id', id).eq('reviewer_id', reviewerId);
  return error ? { ok: false, error: error.message } : done();
}

export async function reanalyze(id: string): Promise<Res> {
  const { sb } = await requireStaff();
  const { data: s, error } = await sb.from('submissions').select('*').eq('id', id).single();
  if (error || !s) return { ok: false, error: 'not_found' };
  try { await runAnalysis(sb, s); } catch (e) { return { ok: false, error: String(e) }; }
  return done();
}

export async function addFilm(fd: FormData): Promise<Res & { ref?: string }> {
  const { sb, festival, user, name } = await requireStaff();
  const row = {
    festival_id: festival.id, title: String(fd.get('title') || '').trim(), director_name: String(fd.get('director') || '').trim(),
    email: String(fd.get('email') || '').trim().toLowerCase() || 'unknown@nas.local', synopsis: String(fd.get('synopsis') || ''),
    screener_url: String(fd.get('url') || '') || null, duration_min: Number(fd.get('duration')) || null, genre: String(fd.get('genre') || '') || null,
    category_id: String(fd.get('category') || '') || null, status: 'processing',
  };
  if (!row.title || !row.director_name) return { ok: false, error: 'أكمل العنوان واسم المخرج.' };
  const { data: s, error } = await sb.from('submissions').insert(row).select('*').single();
  if (error || !s) return { ok: false, error: error?.message };
  await log(sb, festival.id, user.id, name, 'إضافة فيلم', s.ref_code);
  try { await runAnalysis(sb, s); } catch (e) { console.error(e); }
  revalidatePath('/app', 'layout');
  return { ok: true, ref: s.ref_code };
}

export async function deleteFilm(id: string): Promise<Res> {
  const { sb } = await requireStaff();
  const { error } = await sb.from('submissions').delete().eq('id', id);
  return error ? { ok: false, error: error.message } : done();
}

export async function publishDecisions(): Promise<Res & { sent?: number }> {
  const { sb, festival, user, name } = await requireStaff();
  const { data: list } = await sb.from('submissions').select('id,ref_code,title,email,decision').eq('festival_id', festival.id).neq('decision', 'pending').eq('decision_published', false);
  const rows = list || [];
  if (!rows.length) return { ok: true, sent: 0 };
  const { error } = await sb.from('submissions').update({ decision_published: true }).in('id', rows.map((r) => r.id));
  if (error) return { ok: false, error: error.message };
  const T: Record<string, string> = { accepted: 'يسعدنا إبلاغك بقبول فيلمك', shortlisted: 'وصل فيلمك إلى القائمة القصيرة', declined: 'شكرًا لمشاركتك. لم يُختر فيلمك هذه الدورة' };
  for (const r of rows) {
    await sendEmail(r.email, `قرار ${festival.name} · ${r.ref_code}`, wrapEmail(`<h2 style="margin:0 0 10px">${T[r.decision] || 'صدر القرار'}</h2><p style="color:#A1A1A6;line-height:1.8">«${r.title}» · ${festival.name}</p><p style="direction:ltr;text-align:right;color:#8A8A8F">${r.ref_code}</p>`));
  }
  await log(sb, festival.id, user.id, name, 'نشر القرارات', `${rows.length}`);
  revalidatePath('/app', 'layout');
  return { ok: true, sent: rows.length };
}

/** Natural-language search over the festival's films. */
export async function smartSearch(q: string): Promise<{ id: string; why: string }[]> {
  const { sb, festival } = await requireStaff();
  const { data } = await sb.from('submissions').select('id,title,genre,duration_min,country,synopsis,analyses(score,themes,tone,headline)').eq('festival_id', festival.id);
  const films = (data || []).map((s) => ({ ...s, a: s.analyses as unknown as { score: number; themes: string[]; tone: string[]; headline: string } | null }));
  const key = process.env.ANTHROPIC_API_KEY;
  if (key && films.length) {
    try {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const msg = await new Anthropic({ apiKey: key }).messages.create({
        model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001', max_tokens: 800,
        messages: [{ role: 'user', content: `ابحث في أفلام المهرجان عن ما يطابق الطلب: «${q}». أعد JSON فقط: [{"id": "...", "why": "سبب قصير بالعربية"}] مرتبة من الأنسب، بحد أقصى 20، ولا تُرجع غير المطابق.\n\n${JSON.stringify(films.map((f) => ({ id: f.id, title: f.title, genre: f.genre, minutes: f.duration_min, country: f.country, synopsis: (f.synopsis || '').slice(0, 300), themes: f.a?.themes, tone: f.a?.tone })))}` }],
      });
      const text = msg.content.map((b) => ('text' in b ? b.text : '')).join('');
      const arr = JSON.parse(text.slice(text.indexOf('['), text.lastIndexOf(']') + 1));
      if (Array.isArray(arr)) return arr.filter((x) => films.some((f) => f.id === x.id)).map((x) => ({ id: String(x.id), why: String(x.why || '') }));
    } catch (e) { console.error('smart search fallback', e); }
  }
  // built-in: keyword + synonym + duration matching
  const toN = (s: string) => s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  const t = toN(q);
  const words = t.split(/\s+/).map((w) => w.replace(/^(ال|و|ب|عن|في)/, '')).filter((w) => w.length > 2 && !/^(فيلم|أفلام|افلام|عن|في|من|أقل|اكثر|أكثر|دقيقة)$/.test(w));
  const maxMin = /أقل من (\d+)/.exec(t)?.[1]; const minMin = /أكثر من (\d+)/.exec(t)?.[1];
  const res: { id: string; why: string; s: number }[] = [];
  for (const f of films) {
    const hay = [f.title, f.genre, f.country, f.synopsis, ...(f.a?.themes || []), ...(f.a?.tone || [])].join(' ');
    const hits = words.filter((w) => hay.includes(w));
    if (maxMin && !(f.duration_min && f.duration_min < +maxMin)) continue;
    if (minMin && !(f.duration_min && f.duration_min > +minMin)) continue;
    if (!hits.length && (words.length || (!maxMin && !minMin))) continue;
    res.push({ id: f.id, s: hits.length * 2 + (f.a?.score || 0) / 5, why: hits.length ? `يطابق: ${hits.slice(0, 3).join('، ')}` : 'يطابق المدة المطلوبة' });
  }
  return res.sort((a, b) => b.s - a.s).map(({ id, why }) => ({ id, why }));
}
