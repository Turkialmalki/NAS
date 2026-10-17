// Server side of NAS Vision: turns frames + measurements from the browser into a full film report.
// Claude (vision) does the watching when ANTHROPIC_API_KEY is set; otherwise a built-in reader of
// the measurements writes the report. Reports are HMAC-signed so a submission can't carry a forged one.
import { createHmac, timingSafeEqual } from 'crypto';
import { durationRule, type Category } from './analyze';

export type SceneNote = { t: number; caption: string; thumb: string };
export type VideoAnalysis = {
  score: number; headline: string; logline: string; synopsis_draft: string;
  title_guess: string | null; language_guess: string | null; genre_guess: string | null; subgenre: string | null;
  mood: string[]; style: string[]; themes: string[]; tags: string[]; setting: string | null;
  characters: { who: string; note: string }[];
  craft: { label: string; note: string; score: number | null }[];
  breakdown: { label: string; score: number }[];
  audience: string | null; age_rating: string | null; comparables: string[]; programmer_note: string | null;
  scenes: SceneNote[]; key_scene: number;
  checks: { ok: boolean; text: string }[]; flags: string[]; strengths: string[]; watch: string[];
  fit: { category: string; pct: number }[];
  tech: { duration: number; width: number; height: number; aspect: string; resolution: string; size: number | null; audio: boolean | null; cuts: number; pace: string };
  palette: string[]; barcode: string[]; energy: number[]; light: number[];
  model: string; at: string;
};
export type VideoInput = {
  frames: { t: number; image: string; thumb: string }[];
  stats: { duration: number; width: number; height: number; size: number | null; name?: string | null; brightness: number; saturation: number; warmth: number; contrast: number; variety: number; palette: string[]; fadeIn: boolean; fadeOut: boolean; darkShare: number; barcode: string[]; energy: number[]; light: number[]; cuts: number; hasAudio: boolean | null };
  title?: string; synopsis?: string; genre?: string; category_id?: string | null;
};

const GENRES = ['روائي', 'وثائقي', 'تحريك', 'تجريبي'];
const LANGS = ['العربية', 'الإنجليزية', 'أخرى'];
export const clock = (s: number) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = Math.floor(s % 60);
  return (h ? `${h}:${String(m).padStart(2, '0')}` : `${m}`) + `:${String(x).padStart(2, '0')}`;
};
const r1 = (x: number) => Math.round(Math.max(1, Math.min(10, x)) * 10) / 10;

function aspectOf(w: number, h: number) {
  const r = w / h;
  if (r < 0.95) return 'عمودي';
  if (r < 1.1) return '1:1';
  if (r < 1.5) return '4:3';
  if (r < 1.82) return '16:9';
  if (r < 2.1) return '1.85:1';
  return '2.39:1 سينما سكوب';
}
function resolutionOf(w: number, h: number) {
  const s = Math.max(w, h);
  if (s >= 3800) return '4K';
  if (s >= 1900) return 'Full HD';
  if (s >= 1260) return 'HD';
  return 'دقة منخفضة';
}
const paceOf = (variety: number) => (variety > 0.22 ? 'سريع' : variety < 0.09 ? 'متأنٍّ' : 'متوسط');

/** Cleans a file name into a readable title guess ("my_film-FINAL_v3.mp4" → "my film"). */
export function titleFromFile(name?: string | null) {
  if (!name) return null;
  const t = name.replace(/\.[^.]+$/, '').replace(/[_\-.]+/g, ' ')
    .replace(/\b(final|v\d+|ver\d*|export|render|master|screener|h264|h265|hevc|prores|1080p?|2160p?|4k|hd|uhd|mp4|mov|copy|draft|cut|edit|\d{6,8})\b/gi, ' ')
    .replace(/\s+/g, ' ').trim();
  return t.length >= 2 && !/^(img|vid|mvi|dsc|clip|video|movie)\s*\d*$/i.test(t) ? t.slice(0, 80) : null;
}

function baseChecks(v: VideoInput, cats: Category[]) {
  const s = v.stats; const mins = Math.round(s.duration / 60);
  const checks: VideoAnalysis['checks'] = [];
  const res = resolutionOf(s.width, s.height);
  checks.push(res === 'دقة منخفضة' ? { ok: false, text: `الدقة منخفضة (${s.width}×${s.height}) — يُفضّل 1080p على الأقل` } : { ok: true, text: `جودة الصورة ${res} (${s.width}×${s.height})` });
  const chosen = cats.find((c) => c.id === v.category_id);
  if (chosen) {
    const r = durationRule(chosen.description);
    const ok = (r.max == null || mins <= r.max) && (r.min == null || mins >= r.min);
    checks.push({ ok, text: ok ? `المدة (${mins} دقيقة) مطابقة لقسم «${chosen.name}»` : `المدة (${mins} دقيقة) لا تطابق شروط «${chosen.name}»` });
  }
  if (s.hasAudio === false) checks.push({ ok: false, text: 'لم نرصد مسارًا صوتيًا في الملف — تأكد من النسخة' });
  if (s.hasAudio === true) checks.push({ ok: true, text: 'المسار الصوتي موجود' });
  if (s.darkShare > 0.55) checks.push({ ok: false, text: 'نسبة عالية من اللقطات المظلمة — تأكد من نسخة العرض' });
  if (s.width / s.height < 0.95) checks.push({ ok: false, text: 'الفيلم بصيغة عمودية — تأكد أن المهرجان يقبلها' });
  return checks;
}

function fitFor(cats: Category[], mins: number, genre: string | null) {
  return cats.map((c) => {
    let pct = 40; const r = durationRule(c.description);
    if (r.max != null) pct += mins <= r.max ? 35 : -35;
    if (r.min != null) pct += mins >= r.min ? 30 : -35;
    if (genre && c.name.includes(genre)) pct += 40;
    if (/الأول/.test(c.name)) pct = Math.min(pct, 65);
    return { category: c.name, pct: Math.max(3, Math.min(97, pct)) };
  }).sort((a, b) => b.pct - a.pct).slice(0, 3);
}

/** The report written from measurements alone (no AI key configured). */
function builtIn(v: VideoInput, cats: Category[]): VideoAnalysis {
  const s = v.stats; const mins = Math.max(1, Math.round(s.duration / 60));
  const mood: string[] = [];
  if (s.brightness < 0.28) mood.push('قاتم'); else if (s.brightness > 0.55) mood.push('مضيء');
  if (s.warmth > 0.06) mood.push('دافئ'); else if (s.warmth < -0.04) mood.push('بارد');
  if (s.saturation < 0.18) mood.push('هادئ الألوان'); else if (s.saturation > 0.42) mood.push('حيوي');
  const style: string[] = [];
  if (s.saturation < 0.06) style.push('أبيض وأسود');
  if (s.contrast > 0.62) style.push('تباين عالٍ'); else if (s.contrast < 0.35) style.push('إضاءة ناعمة');
  if (s.variety > 0.22) style.push('مونتاج سريع'); else if (s.variety < 0.09) style.push('لقطات طويلة متأنية');
  if (s.width / s.height >= 2.1) style.push('تأطير سينمائي عريض');
  const genre = v.genre || (mins <= 15 && s.saturation > 0.45 ? 'تحريك' : null);
  const resolution = resolutionOf(s.width, s.height);
  const tech = { duration: s.duration, width: s.width, height: s.height, aspect: aspectOf(s.width, s.height), resolution, size: s.size, audio: s.hasAudio, cuts: s.cuts, pace: paceOf(s.variety) };
  const checks = baseChecks(v, cats);
  const technical = r1(5.5 + (resolution === '4K' ? 3.5 : resolution === 'Full HD' ? 2.8 : resolution === 'HD' ? 1.6 : -1) + (s.hasAudio === false ? -2 : 0));
  const visual = r1(5.6 + Math.min(1.6, s.contrast * 2) + (s.saturation > 0.06 && s.saturation < 0.5 ? 0.8 : 0.3) + (s.width / s.height >= 1.8 ? 0.6 : 0));
  const rhythm = r1(6.2 + (s.variety > 0.06 && s.variety < 0.3 ? 1.2 : 0.2) + (s.fadeIn ? 0.3 : 0) + (s.fadeOut ? 0.3 : 0));
  const breakdown = [{ label: 'الصورة', score: visual }, { label: 'الإيقاع', score: rhythm }, { label: 'الجودة التقنية', score: technical }];
  const score = r1((visual + rhythm + technical) / 3 - checks.filter((c) => !c.ok).length * 0.2);
  const title = titleFromFile(s.name) || null;
  return {
    score, headline: `${resolution} بتأطير ${tech.aspect}، ونبرة ${mood[0] || 'متوازنة'} وإيقاع ${tech.pace} على مدى ${mins} دقيقة.`,
    logline: '', synopsis_draft: '', title_guess: title, language_guess: null, genre_guess: genre, subgenre: null,
    mood: mood.slice(0, 3), style: style.slice(0, 3), themes: [], tags: [], setting: null, characters: [],
    craft: [
      { label: 'الإضاءة', note: s.brightness < 0.28 ? 'منخفضة ومعتمة في أغلب الفيلم' : s.brightness > 0.55 ? 'مشرقة وواضحة' : 'متوازنة', score: null },
      { label: 'اللون', note: s.saturation < 0.06 ? 'أحادي اللون' : s.warmth > 0.06 ? 'درجات دافئة تغلب على الصورة' : s.warmth < -0.04 ? 'درجات باردة تغلب على الصورة' : 'ألوان طبيعية', score: null },
      { label: 'الإيقاع', note: `إيقاع ${tech.pace}، ونحو ${s.cuts} انتقالات بصرية كبيرة بين العينات`, score: null },
      { label: 'البداية والنهاية', note: [s.fadeIn ? 'يبدأ بتلاشٍ من الأسود' : 'يبدأ مباشرة', s.fadeOut ? 'وينتهي بتلاشٍ' : 'وينتهي على صورة'].join(' '), score: null },
    ],
    breakdown, audience: null, age_rating: null, comparables: [], programmer_note: null,
    scenes: v.frames.map((f) => ({ t: f.t, caption: '', thumb: f.thumb })), key_scene: Math.floor(v.frames.length / 2),
    checks, flags: [], strengths: [resolution !== 'دقة منخفضة' ? `جودة صورة ${resolution}.` : 'الفيلم مكتمل وقابل للعرض.', style[0] ? `${style[0]}.` : 'هوية بصرية متّسقة.'],
    watch: [], fit: fitFor(cats, mins, genre), tech, palette: s.palette, barcode: s.barcode, energy: s.energy, light: s.light,
    model: 'nas-vision-builtin', at: new Date().toISOString(),
  };
}

async function withClaude(v: VideoInput, cats: Category[]): Promise<VideoAnalysis | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || !v.frames.length) return null;
  const base = builtIn(v, cats);
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const client = new Anthropic({ apiKey: key });
  const s = v.stats; const mins = Math.max(1, Math.round(s.duration / 60));
  const content: Array<{ type: 'text'; text: string } | { type: 'image'; source: { type: 'base64'; media_type: 'image/jpeg'; data: string } }> = [];
  v.frames.forEach((f, i) => {
    content.push({ type: 'text', text: `اللقطة ${i + 1} · ${clock(f.t)}` });
    content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: f.image.replace(/^data:image\/\w+;base64,/, '') } });
  });
  content.push({ type: 'text', text: `أنت مبرمج أفلام خبير وناقد سينمائي في لجنة اختيار مهرجان سينمائي عربي كبير. أمامك ${v.frames.length} لقطات موزعة بالتساوي على فيلم مدته ${mins} دقيقة (اللقطة الأولى قرب البداية والأخيرة قرب النهاية).
قياسات تقنية: ${s.width}×${s.height} (${base.tech.resolution})، التأطير ${base.tech.aspect}، السطوع ${(s.brightness * 100).toFixed(0)}٪، التشبع ${(s.saturation * 100).toFixed(0)}٪، التباين ${(s.contrast * 100).toFixed(0)}٪، الإيقاع ${base.tech.pace} (${s.cuts} انتقالات كبيرة)، صوت: ${s.hasAudio === true ? 'موجود' : s.hasAudio === false ? 'غير موجود' : 'غير معروف'}.
اسم الملف: ${s.name || 'غير معروف'}
${v.title ? `العنوان الذي كتبه صاحب الفيلم: ${v.title}\n` : ''}${v.genre ? `النوع المعلن: ${v.genre}\n` : ''}${v.synopsis ? `ملخص صاحب الفيلم: ${v.synopsis.slice(0, 1500)}\n` : ''}أقسام المهرجان: ${cats.map((c) => `${c.name} (${c.description || ''})`).join('، ') || 'غير محددة'}

اكتب تقريرًا احترافيًا مدهشًا ودقيقًا يساعد اللجنة وصاحب الفيلم. التزم بما تراه فعلًا في اللقطات؛ لا تخترع أسماء ممثلين أو أحداثًا غير ظاهرة. اقرأ أي نص يظهر على الشاشة (عنوان، ترجمة، شارة) واستفد منه.
اكتب بعربية فصحى أنيقة وموجزة. أعد JSON فقط بهذا الشكل:
{"score": رقم 1-10 بخانة عشرية (تقييم أولي للحرفة البصرية والجاذبية),
"headline": "جملة واحدة لافتة تلخص انطباع اللجنة",
"logline": "جملة واحدة عمّا يبدو أن الفيلم يدور حوله",
"synopsis_draft": "ملخص جذاب من ٣ إلى ٤ أسطر مبني على ما يظهر",
"title_guess": "العنوان إن ظهر على الشاشة، أو عنوان مقترح من اسم الملف، أو null",
"language_guess": "واحد من: ${LANGS.join('، ')} بحسب النصوص الظاهرة أو null",
"genre_guess": "واحد من: ${GENRES.join('، ')}", "subgenre": "نوع فرعي بكلمتين مثل: دراما عائلية",
"mood": ["حتى 3"], "style": ["حتى 3 سمات أسلوبية"], "themes": ["حتى 4 موضوعات"], "tags": ["حتى 6 وسوم قصيرة"],
"setting": "المكان والزمن الظاهر",
"characters": [{"who": "وصف الشخصية الظاهرة (مثل: امرأة مسنّة)", "note": "حضورها في الصورة"}],
"craft": [{"label": "التصوير", "note": "...", "score": 1-10}, {"label": "الإضاءة", "note": "...", "score": 1-10}, {"label": "اللون", "note": "...", "score": 1-10}, {"label": "التكوين", "note": "...", "score": 1-10}, {"label": "الإيقاع والمونتاج", "note": "...", "score": 1-10}],
"breakdown": [{"label": "القصة المرئية", "score": 1-10}, {"label": "الإخراج", "score": 1-10}, {"label": "الصورة", "score": 1-10}, {"label": "الأصالة", "score": 1-10}, {"label": "الجودة التقنية", "score": 1-10}],
"audience": "الجمهور المناسب باختصار", "age_rating": "واحد من: للجميع، +12، +15، +18",
"comparables": ["حتى فيلمين أو مخرجين يشبههما الأسلوب بوضوح، أو قائمة فارغة"],
"programmer_note": "فقرة من ٣ أسطر يكتبها المبرمج للجنة: لماذا قد يُختار هذا الفيلم وأين قد يُعرض",
"scenes": ["وصف حي ودقيق لكل لقطة بالترتيب، ${v.frames.length} عناصر"], "key_scene": رقم اللقطة الأقوى بصريًا (1-${v.frames.length}),
"flags": ["تنبيهات محتوى إن ظهرت: عنف، دم، تدخين، عري…"], "strengths": ["٣ نقاط قوة"], "watch": ["ملاحظة أو اثنتان للمحكّمين"],
"fit": [{"category": "اسم القسم كما هو", "pct": 0-100}]}` });

  const models = [process.env.ANTHROPIC_VISION_MODEL || 'claude-sonnet-4-5', process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001'];
  const started = Date.now();
  for (const model of models) {
    const left = 52_000 - (Date.now() - started);
    if (left < 12_000) break; // stay inside the 60s function limit
    try {
      const msg = await client.messages.create({ model, max_tokens: 3500, messages: [{ role: 'user', content }] }, { timeout: left, maxRetries: 0 });
      const text = msg.content.map((b) => ('text' in b ? b.text : '')).join('');
      const j = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
      const arr = (x: unknown, n: number, len = 160) => (Array.isArray(x) ? x.slice(0, n).map((y) => String(y).slice(0, len)).filter(Boolean) : []);
      const str = (x: unknown, n: number) => (typeof x === 'string' && x.trim() && x.trim() !== 'null' ? x.trim().slice(0, n) : null);
      const scenes: string[] = arr(j.scenes, v.frames.length, 220);
      const num = (x: unknown) => (Number.isFinite(Number(x)) && Number(x) > 0 ? r1(Number(x)) : null);
      const breakdown = Array.isArray(j.breakdown) ? j.breakdown.slice(0, 6).map((b: { label: string; score: number }) => ({ label: String(b.label).slice(0, 30), score: num(b.score) ?? 5 })) : base.breakdown;
      return {
        ...base,
        score: num(j.score) ?? base.score,
        headline: str(j.headline, 220) || base.headline,
        logline: str(j.logline, 260) || '',
        synopsis_draft: str(j.synopsis_draft, 900) || '',
        title_guess: str(j.title_guess, 90) || base.title_guess,
        language_guess: LANGS.includes(String(j.language_guess)) ? String(j.language_guess) : null,
        genre_guess: GENRES.includes(String(j.genre_guess)) ? String(j.genre_guess) : base.genre_guess,
        subgenre: str(j.subgenre, 40),
        mood: arr(j.mood, 3).length ? arr(j.mood, 3) : base.mood,
        style: arr(j.style, 3).length ? arr(j.style, 3) : base.style,
        themes: arr(j.themes, 4), tags: arr(j.tags, 6, 30), setting: str(j.setting, 180),
        characters: Array.isArray(j.characters) ? j.characters.slice(0, 4).map((c: { who: string; note: string }) => ({ who: String(c.who || '').slice(0, 60), note: String(c.note || '').slice(0, 160) })).filter((c: { who: string }) => c.who) : [],
        craft: Array.isArray(j.craft) && j.craft.length ? j.craft.slice(0, 5).map((c: { label: string; note: string; score: number }) => ({ label: String(c.label).slice(0, 30), note: String(c.note).slice(0, 240), score: num(c.score) })) : base.craft,
        breakdown,
        audience: str(j.audience, 140), age_rating: str(j.age_rating, 12), comparables: arr(j.comparables, 2, 80), programmer_note: str(j.programmer_note, 700),
        scenes: v.frames.map((f, i) => ({ t: f.t, caption: scenes[i] || '', thumb: f.thumb })),
        key_scene: Math.max(0, Math.min(v.frames.length - 1, (Number(j.key_scene) || 1) - 1)),
        flags: arr(j.flags, 4), strengths: arr(j.strengths, 3).length ? arr(j.strengths, 3) : base.strengths, watch: arr(j.watch, 3),
        fit: Array.isArray(j.fit) && j.fit.length ? j.fit.slice(0, 3).map((x: { category: string; pct: number }) => ({ category: String(x.category), pct: Math.max(0, Math.min(100, Math.round(Number(x.pct) || 0))) })) : base.fit,
        model,
      };
    } catch (e) { console.error('vision analysis failed with', model, e); }
  }
  return null;
}

export async function analyzeVideo(v: VideoInput, cats: Category[]): Promise<VideoAnalysis> {
  return (await withClaude(v, cats)) || builtIn(v, cats);
}

const secret = () => process.env.ANALYSIS_SECRET || process.env.ANTHROPIC_API_KEY || process.env.RESEND_API_KEY || process.env.NEXT_PUBLIC_SUPABASE_URL || 'nas';
export const signReport = (a: VideoAnalysis) => createHmac('sha256', secret()).update(JSON.stringify(a)).digest('hex');
export function verifyReport(a: unknown, sig: unknown): a is VideoAnalysis {
  if (!a || typeof sig !== 'string' || sig.length !== 64) return false;
  const want = Buffer.from(createHmac('sha256', secret()).update(JSON.stringify(a)).digest('hex'));
  const got = Buffer.from(sig);
  return want.length === got.length && timingSafeEqual(want, got);
}

/** One score for the film: text analysis and video analysis together. */
export const blendScore = (text: number | null | undefined, video: number) =>
  Math.round(((text != null ? (Number(text) + video * 2) / 3 : video)) * 10) / 10;
