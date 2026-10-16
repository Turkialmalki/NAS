// Film analysis: Claude when ANTHROPIC_API_KEY is set, otherwise a built-in analyzer.
// Output shape is stored in public.analyses.

export type Category = { id: string; name: string; description?: string | null };
export type Reviewer = { user_id: string; name: string | null; specialty: string | null; open_count: number };
export type FilmInput = {
  title: string; synopsis: string; genre?: string | null; duration_min?: number | null;
  language?: string | null; country?: string | null; category_id?: string | null; screener_url?: string | null;
};
export type Analysis = {
  score: number; headline: string; themes: string[]; tone: string[];
  fit: { category: string; pct: number }[]; checks: { ok: boolean; text: string }[];
  strengths: string[]; suggested_reviewer: string | null; model: string;
};

const ARDIG = '٠١٢٣٤٥٦٧٨٩';
const toLatin = (s: string) => s.replace(/[٠-٩]/g, (d) => String(ARDIG.indexOf(d)));

/** Reads "أقل من ٤٠ دقيقة" / "أكثر من ٦٠ دقيقة" style category descriptions. */
export function durationRule(desc?: string | null): { min?: number; max?: number } {
  if (!desc) return {};
  const t = toLatin(desc);
  const n = Number((t.match(/(\d+)/) || [])[1]);
  if (!n) return {};
  if (/أقل|حتى|لا يتجاوز/.test(t)) return { max: n };
  if (/أكثر|فوق/.test(t)) return { min: n };
  return {};
}

export async function checkLink(url?: string | null): Promise<boolean | null> {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol)) return false;
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 6000);
    let r = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: ctl.signal }).catch(() => null);
    if (!r || r.status === 405 || r.status === 403) r = await fetch(url, { method: 'GET', redirect: 'follow', signal: ctl.signal }).catch(() => null);
    clearTimeout(t);
    return !!r && r.status < 400;
  } catch { return false; }
}

const THEMES: [RegExp, string][] = [
  [/أرض|جبل|صحراء|مزرعة|قرية|ريف/, 'الأرض'], [/عائل|أب|أم|جد|ابن|ابنة|أخ|أخت|أبناء/, 'العائلة'],
  [/مدينة|هجرة|رحيل|سفر|غربة|انتقال/, 'الهجرة'], [/بحر|ميناء|صياد|غوص|ساحل/, 'البحر'],
  [/ذاكرة|ذكريات|ماض|رسائل|تاريخ/, 'الذاكرة'], [/حب|زواج|عشق|خطوبة/, 'الحب'],
  [/حرب|نزاع|عنف|سجن/, 'الصراع'], [/طفل|طفولة|مدرسة|صغير/, 'الطفولة'], [/تراث|شعبي|حكاية|أسطورة/, 'التراث'],
  [/موت|فقد|رحل|وفاة|حزن/, 'الفقد'], [/مرأة|فتاة|نساء|امرأة/, 'المرأة'], [/حلم|خيال|سحر|قمر/, 'الخيال'],
  [/نضوج|مراهق|شباب/, 'النضوج'], [/عمل|وظيفة|فقر|مال/, 'العمل'], [/موسيق|غناء|فن|رسم/, 'الفن'],
];
const TONES: [RegExp, string][] = [
  [/صمت|هدوء|تأمل|بطء|شتاء|أخير/, 'تأمّلي'], [/ضحك|كوميد|مرح|طريف/, 'مرح'], [/خوف|رعب|غموض|سر/, 'غامض'],
  [/حزن|فقد|وداع|موت/, 'حزين'], [/دفء|حنين|حنان/, 'دافئ'], [/مطاردة|سرعة|هروب/, 'مشوّق'], [/حلم|قمر|سماء|شعر/, 'شاعري'],
];

function heuristic(f: FilmInput, cats: Category[], pool: Reviewer[], linkOk: boolean | null): Analysis {
  const syn = (f.synopsis || '').trim();
  const words = syn.split(/\s+/).filter(Boolean).length;
  const themes = THEMES.filter(([r]) => r.test(syn + ' ' + f.title)).map(([, t]) => t).slice(0, 3);
  const tone = TONES.filter(([r]) => r.test(syn)).map(([, t]) => t).slice(0, 2);
  const genre = f.genre || '';
  const fit = cats.map((c) => {
    let pct = 35;
    const rule = durationRule(c.description);
    const d = f.duration_min || 0;
    if (d && rule.max != null) pct += d <= rule.max ? 40 : -30;
    if (d && rule.min != null) pct += d >= rule.min ? 35 : -30;
    if (genre && c.name.includes(genre)) pct += 45;
    if (/وثائق/.test(c.name) && /وثائق/.test(genre)) pct += 10;
    if (/قصير/.test(c.name) && /تحريك|قصير/.test(genre) && d && d <= 40) pct += 15;
    if (/الأول/.test(c.name)) pct = Math.min(pct, 70);
    return { category: c.name, pct: Math.max(3, Math.min(98, pct)) };
  }).sort((a, b) => b.pct - a.pct);

  const checks: Analysis['checks'] = [];
  if (linkOk === true) checks.push({ ok: true, text: 'رابط المشاهدة يعمل' });
  if (linkOk === false) checks.push({ ok: false, text: 'رابط المشاهدة لا يعمل — يحتاج تحديث' });
  const chosen = cats.find((c) => c.id === f.category_id);
  if (chosen && f.duration_min) {
    const r = durationRule(chosen.description);
    const okDur = (r.max == null || f.duration_min <= r.max) && (r.min == null || f.duration_min >= r.min);
    checks.push({ ok: okDur, text: okDur ? 'المدة مطابقة لشروط القسم' : `المدة لا تطابق شروط قسم «${chosen.name}»` });
  }
  if (words < 18) checks.push({ ok: false, text: 'الملخص قصير — يُفضّل ملخص أوضح' });
  else checks.push({ ok: true, text: 'الملخص واضح ومكتمل' });
  if (f.language && !/عرب/.test(f.language)) checks.push({ ok: false, text: 'تأكد من وجود ترجمة عربية أو إنجليزية' });

  let score = 6.2 + Math.min(words, 60) / 30 + themes.length * 0.35 + tone.length * 0.2;
  if (linkOk === false) score -= 0.8;
  if (fit[0] && fit[0].pct >= 75) score += 0.4;
  score = Math.round(Math.max(4, Math.min(9.6, score)) * 10) / 10;

  const best = fit[0]?.category;
  const headline = words < 18
    ? 'فكرة واعدة، لكن الملخص يحتاج تفاصيل أكثر.'
    : `${themes.length ? 'موضوع ' + themes.slice(0, 2).join(' و') + ' بملخص واضح' : 'ملخص واضح'}${best ? '، ويناسب قسم ' + best : ''}.`;
  const strengths = [
    themes.length ? `موضوع ${themes[0]} حاضر بوضوح في الملخص.` : 'فكرة مكتملة في سطور قليلة.',
    tone.length ? `نبرة ${tone[0]} تميّزه عن غيره.` : 'بناء بسيط يسهل على اللجنة متابعته.',
  ];
  return { score, headline, themes, tone, fit: fit.slice(0, 3), checks, strengths, suggested_reviewer: pickReviewer(pool, genre, best), model: 'nas-builtin' };
}

export function pickReviewer(pool: Reviewer[], genre: string, cat?: string): string | null {
  if (!pool.length) return null;
  const score = (r: Reviewer) => {
    const sp = r.specialty || '';
    let s = -Number(r.open_count) * 1.5;
    if (genre && sp.includes(genre)) s += 10;
    if (cat && sp && cat.includes(sp.replace('ي', ''))) s += 6;
    if (/كل/.test(sp)) s += 2;
    return s;
  };
  return [...pool].sort((a, b) => score(b) - score(a))[0].user_id;
}

async function withClaude(f: FilmInput, cats: Category[], pool: Reviewer[], linkOk: boolean | null): Promise<Analysis | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: key });
    const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';
    const prompt = `أنت مساعد لجنة اختيار في مهرجان سينمائي عربي. حلّل المشاركة التالية من ملخصها وبياناتها فقط، ولا تخترع معلومات.
أعد JSON فقط بهذا الشكل:
{"score": رقم من 1 إلى 10 بخانة عشرية, "headline": "جملة واحدة قصيرة بالعربية", "themes": ["حتى 3 موضوعات بكلمة أو كلمتين"], "tone": ["حتى كلمتين تصفان النبرة"],
"fit": [{"category": "اسم القسم كما هو", "pct": 0-100}], "strengths": ["نقطتا قوة قصيرتان"], "notes": ["ملاحظة أو اثنتان تستحقان انتباه اللجنة، إن وجدت"]}

الأقسام المتاحة: ${cats.map((c) => `${c.name} (${c.description || ''})`).join('، ')}
العنوان: ${f.title}
النوع: ${f.genre || 'غير محدد'} · المدة: ${f.duration_min || 'غير محددة'} دقيقة · اللغة: ${f.language || 'غير محددة'} · البلد: ${f.country || ''}
الملخص: ${f.synopsis}`;
    const msg = await client.messages.create({ model, max_tokens: 700, messages: [{ role: 'user', content: prompt }] });
    const text = msg.content.map((b) => ('text' in b ? b.text : '')).join('');
    const j = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
    const base = heuristic(f, cats, pool, linkOk);
    const notes: string[] = Array.isArray(j.notes) ? j.notes.slice(0, 2) : [];
    return {
      score: Math.round(Math.max(1, Math.min(10, Number(j.score) || base.score)) * 10) / 10,
      headline: String(j.headline || base.headline).slice(0, 200),
      themes: (j.themes || base.themes).slice(0, 3).map(String),
      tone: (j.tone || base.tone).slice(0, 2).map(String),
      fit: Array.isArray(j.fit) && j.fit.length ? j.fit.slice(0, 3).map((x: { category: string; pct: number }) => ({ category: String(x.category), pct: Math.max(0, Math.min(100, Math.round(Number(x.pct) || 0))) })) : base.fit,
      checks: [...base.checks.filter((c) => !/الملخص/.test(c.text)), ...notes.map((n) => ({ ok: false, text: String(n) }))].slice(0, 4),
      strengths: (j.strengths || base.strengths).slice(0, 2).map(String),
      suggested_reviewer: pickReviewer(pool, f.genre || '', j.fit?.[0]?.category),
      model,
    };
  } catch (e) {
    console.error('claude analysis failed, using built-in', e);
    return null;
  }
}

export async function analyzeFilm(f: FilmInput, cats: Category[], pool: Reviewer[]): Promise<Analysis> {
  const linkOk = await checkLink(f.screener_url);
  return (await withClaude(f, cats, pool, linkOk)) || heuristic(f, cats, pool, linkOk);
}

/** Rewrites a synopsis more clearly (Claude if available, else light cleanup). */
export async function improveSynopsis(text: string): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!key || !clean) return clean && !/[.!؟]$/.test(clean) ? clean + '.' : clean;
  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: key });
    const msg = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001', max_tokens: 400,
      messages: [{ role: 'user', content: `أعد صياغة ملخص الفيلم التالي بعربية فصحى واضحة وجذابة في سطرين إلى أربعة، دون إضافة أحداث أو معلومات غير موجودة. أعد النص فقط.\n\n${clean}` }],
    });
    return msg.content.map((b) => ('text' in b ? b.text : '')).join('').trim() || clean;
  } catch { return clean; }
}
