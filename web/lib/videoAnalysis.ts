// Server side of NAS Vision: turns frames + measurements from the browser into a film report.
// Uses Claude (vision) when ANTHROPIC_API_KEY is set, otherwise a built-in reader of the
// measurements. Reports are HMAC-signed so a submission can't carry a forged report.
import { createHmac, timingSafeEqual } from 'crypto';
import { durationRule, type Category } from './analyze';

export type SceneNote = { t: number; caption: string; thumb: string };
export type VideoAnalysis = {
  score: number; headline: string; logline: string; synopsis_draft: string; genre_guess: string | null;
  mood: string[]; style: string[]; themes: string[]; setting: string | null;
  craft: { label: string; note: string }[]; scenes: SceneNote[];
  checks: { ok: boolean; text: string }[]; flags: string[]; strengths: string[]; watch: string[];
  fit: { category: string; pct: number }[];
  tech: { duration: number; width: number; height: number; aspect: string; resolution: string; size: number | null };
  palette: string[]; model: string; at: string;
};
export type VideoInput = {
  frames: { t: number; image: string; thumb: string }[];
  stats: { duration: number; width: number; height: number; size: number | null; brightness: number; saturation: number; warmth: number; contrast: number; variety: number; palette: string[]; fadeIn: boolean; fadeOut: boolean; darkShare: number };
  title?: string; synopsis?: string; genre?: string; category_id?: string | null;
};

const GENRES = ['روائي', 'وثائقي', 'تحريك', 'تجريبي'];
export const clock = (s: number) => {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = Math.floor(s % 60);
  return (h ? `${h}:${String(m).padStart(2, '0')}` : `${m}`) + `:${String(x).padStart(2, '0')}`;
};

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

/** Reads the measurements when no AI key is configured. */
function builtIn(v: VideoInput, cats: Category[]): VideoAnalysis {
  const s = v.stats; const mins = Math.round(s.duration / 60);
  const mood: string[] = [];
  if (s.brightness < 0.28) mood.push('قاتم'); else if (s.brightness > 0.55) mood.push('مضيء');
  if (s.warmth > 0.06) mood.push('دافئ'); else if (s.warmth < -0.04) mood.push('بارد');
  if (s.saturation < 0.18) mood.push('هادئ الألوان'); else if (s.saturation > 0.42) mood.push('حيوي');
  const style: string[] = [];
  if (s.saturation < 0.06) style.push('أبيض وأسود');
  if (s.contrast > 0.62) style.push('تباين عالٍ'); else if (s.contrast < 0.35) style.push('إضاءة ناعمة');
  if (s.variety > 0.22) style.push('إيقاع بصري متنوّع'); else if (s.variety < 0.09) style.push('لقطات طويلة متأنية');
  if (s.width / s.height >= 2.1) style.push('تأطير سينمائي عريض');
  const genre = v.genre || (mins <= 15 && s.saturation > 0.45 ? 'تحريك' : null);
  const tech = { duration: s.duration, width: s.width, height: s.height, aspect: aspectOf(s.width, s.height), resolution: resolutionOf(s.width, s.height), size: s.size };
  const checks = baseChecks(v, cats);
  let score = 6.4 + (tech.resolution === '4K' ? 0.8 : tech.resolution === 'Full HD' ? 0.5 : tech.resolution === 'HD' ? 0.1 : -0.8)
    + Math.min(0.6, s.contrast * 0.6) + (s.fadeIn ? 0.2 : 0) + (s.fadeOut ? 0.2 : 0) - checks.filter((c) => !c.ok).length * 0.4;
  score = Math.round(Math.max(4, Math.min(9.2, score)) * 10) / 10;
  return {
    score, headline: `${tech.resolution} بتأطير ${tech.aspect}، ونبرة ${mood[0] || 'متوازنة'} على مدى ${mins} دقيقة.`,
    logline: '', synopsis_draft: '', genre_guess: genre, mood: mood.slice(0, 3), style: style.slice(0, 3), themes: [], setting: null,
    craft: [
      { label: 'الإضاءة', note: s.brightness < 0.28 ? 'منخفضة ومعتمة في أغلب الفيلم' : s.brightness > 0.55 ? 'مشرقة وواضحة' : 'متوازنة' },
      { label: 'اللون', note: s.saturation < 0.06 ? 'أحادي اللون' : s.warmth > 0.06 ? 'درجات دافئة تغلب على الصورة' : s.warmth < -0.04 ? 'درجات باردة تغلب على الصورة' : 'ألوان طبيعية' },
      { label: 'الإيقاع', note: s.variety > 0.22 ? 'تنقّل بصري كثير بين المشاهد' : s.variety < 0.09 ? 'مشاهد متقاربة بصريًا وإيقاع هادئ' : 'إيقاع متوسط' },
      { label: 'البداية والنهاية', note: [s.fadeIn ? 'يبدأ بتلاشٍ من الأسود' : 'يبدأ مباشرة', s.fadeOut ? 'وينتهي بتلاشٍ' : 'وينتهي على صورة'].join(' ') },
    ],
    scenes: v.frames.map((f) => ({ t: f.t, caption: '', thumb: f.thumb })),
    checks, flags: [], strengths: [tech.resolution !== 'دقة منخفضة' ? `جودة صورة ${tech.resolution}.` : 'الفيلم مكتمل وقابل للعرض.', style[0] ? `${style[0]}.` : 'هوية بصرية متّسقة.'],
    watch: [], fit: fitFor(cats, mins, genre), tech, palette: s.palette, model: 'nas-vision-builtin', at: new Date().toISOString(),
  };
}

async function withClaude(v: VideoInput, cats: Category[]): Promise<VideoAnalysis | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || !v.frames.length) return null;
  const base = builtIn(v, cats);
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const client = new Anthropic({ apiKey: key });
  const s = v.stats; const mins = Math.round(s.duration / 60);
  const content: Array<{ type: 'text'; text: string } | { type: 'image'; source: { type: 'base64'; media_type: 'image/jpeg'; data: string } }> = [];
  v.frames.forEach((f, i) => {
    content.push({ type: 'text', text: `اللقطة ${i + 1} · الدقيقة ${clock(f.t)}` });
    content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: f.image.replace(/^data:image\/\w+;base64,/, '') } });
  });
  content.push({ type: 'text', text: `أنت مبرمج أفلام خبير في لجنة اختيار مهرجان سينمائي عربي. أمامك ${v.frames.length} لقطات موزعة بالتساوي على فيلم مدته ${mins} دقيقة.
بيانات تقنية مقاسة: الدقة ${s.width}×${s.height} (${base.tech.resolution})، التأطير ${base.tech.aspect}، السطوع ${(s.brightness * 100).toFixed(0)}٪، التشبع ${(s.saturation * 100).toFixed(0)}٪، التباين ${(s.contrast * 100).toFixed(0)}٪، التنوع البصري ${(s.variety * 100).toFixed(0)}٪.
${v.title ? `العنوان: ${v.title}\n` : ''}${v.genre ? `النوع المعلن: ${v.genre}\n` : ''}${v.synopsis ? `ملخص صاحب الفيلم: ${v.synopsis.slice(0, 1200)}\n` : ''}الأقسام: ${cats.map((c) => `${c.name} (${c.description || ''})`).join('، ') || 'غير محددة'}

صِف ما تراه فعلًا في اللقطات فقط ولا تخترع أحداثًا أو أسماء. اكتب بعربية فصحى موجزة وأنيقة.
أعد JSON فقط بهذا الشكل:
{"score": رقم 1-10 بخانة عشرية يقيّم الجودة البصرية والحرفية الظاهرة,
"headline": "جملة واحدة تلخص انطباع اللجنة",
"logline": "جملة واحدة عمّا يبدو أن الفيلم يدور حوله",
"synopsis_draft": "ملخص مقترح من سطرين إلى ثلاثة مبني على ما يظهر فقط",
"genre_guess": "واحد من: ${GENRES.join('، ')}",
"mood": ["حتى 3 كلمات"], "style": ["حتى 3 سمات أسلوبية"], "themes": ["حتى 3 موضوعات"], "setting": "المكان والزمن الظاهر باختصار",
"craft": [{"label": "التصوير", "note": "..."}, {"label": "الإضاءة", "note": "..."}, {"label": "اللون", "note": "..."}, {"label": "التكوين", "note": "..."}],
"scenes": ["وصف قصير جدًا لكل لقطة بالترتيب، ${v.frames.length} عناصر"],
"flags": ["محتوى قد يحتاج تنبيهًا للجمهور إن ظهر: عنف، تدخين، دم، عري… أو اترك القائمة فارغة"],
"strengths": ["نقطتا قوة"], "watch": ["ملاحظة أو اثنتان تستحقان انتباه المحكّمين"],
"fit": [{"category": "اسم القسم كما هو", "pct": 0-100}]}` });

  const models = [process.env.ANTHROPIC_VISION_MODEL || 'claude-sonnet-4-5', process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001'];
  for (const model of models) {
    try {
      const msg = await client.messages.create({ model, max_tokens: 2000, messages: [{ role: 'user', content }] });
      const text = msg.content.map((b) => ('text' in b ? b.text : '')).join('');
      const j = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
      const arr = (x: unknown, n: number) => (Array.isArray(x) ? x.slice(0, n).map((y) => String(y).slice(0, 160)) : []);
      const scenes: string[] = arr(j.scenes, v.frames.length);
      return {
        ...base,
        score: Math.round(Math.max(1, Math.min(10, Number(j.score) || base.score)) * 10) / 10,
        headline: String(j.headline || base.headline).slice(0, 220),
        logline: String(j.logline || '').slice(0, 260),
        synopsis_draft: String(j.synopsis_draft || '').slice(0, 700),
        genre_guess: GENRES.includes(String(j.genre_guess)) ? String(j.genre_guess) : base.genre_guess,
        mood: arr(j.mood, 3).length ? arr(j.mood, 3) : base.mood,
        style: arr(j.style, 3).length ? arr(j.style, 3) : base.style,
        themes: arr(j.themes, 3), setting: j.setting ? String(j.setting).slice(0, 160) : null,
        craft: Array.isArray(j.craft) && j.craft.length ? j.craft.slice(0, 4).map((c: { label: string; note: string }) => ({ label: String(c.label).slice(0, 30), note: String(c.note).slice(0, 220) })) : base.craft,
        scenes: v.frames.map((f, i) => ({ t: f.t, caption: scenes[i] || '', thumb: f.thumb })),
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
