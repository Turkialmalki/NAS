import { slugFrom } from './slug';
export { slugFrom };

// Turns a festival document (text, or a scanned PDF / poster image) into a ready festival setup.
// Claude does the reading when ANTHROPIC_API_KEY is set; otherwise a built-in reader pulls out
// names, dates, places, categories, rules and judging criteria from the text.

export type FestivalDraft = {
  name: string; slug: string; city: string | null; country: string | null; description: string | null;
  starts_on: string | null; ends_on: string | null;
  submissions_open: string | null; submissions_close: string | null; review_deadline: string | null; results_on: string | null;
  fee_note: string | null; rules: string[];
  categories: { name: string; description: string | null; fee: string | null }[];
  criteria: { name: string; weight: number }[];
  contact_email: string | null; website: string | null;
  highlights: string[]; found: string[]; model: string;
};
export type DocIn = { name: string; kind: string; text: string; file?: { media_type: string; data: string } };

const DIG = '٠١٢٣٤٥٦٧٨٩';
const latin = (s: string) => s.replace(/[٠-٩]/g, (d) => String(DIG.indexOf(d))).replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
const iso = (y: number, m: number, d: number) => (y > 1900 && m >= 1 && m <= 12 && d >= 1 && d <= 31 ? `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` : null);

const MONTHS: [RegExp, number][] = [
  [/يناير|كانون الثاني|january|\bjan\b/i, 1], [/فبراير|شباط|february|\bfeb\b/i, 2], [/مارس|آذار|march|\bmar\b/i, 3], [/أبريل|ابريل|إبريل|نيسان|april|\bapr\b/i, 4],
  [/مايو|أيار|ايار|\bmay\b/i, 5], [/يونيو|حزيران|june|\bjun\b/i, 6], [/يوليو|تموز|july|\bjul\b/i, 7], [/أغسطس|اغسطس|آب|august|\baug\b/i, 8],
  [/سبتمبر|أيلول|ايلول|september|\bsept?\b/i, 9], [/أكتوبر|اكتوبر|تشرين الأول|october|\boct\b/i, 10], [/نوفمبر|تشرين الثاني|november|\bnov\b/i, 11], [/ديسمبر|كانون الأول|december|\bdec\b/i, 12],
];
const MONTH_WORDS = 'يناير|فبراير|مارس|أبريل|ابريل|إبريل|مايو|يونيو|يوليو|أغسطس|اغسطس|سبتمبر|أكتوبر|اكتوبر|نوفمبر|ديسمبر|كانون الثاني|شباط|آذار|نيسان|أيار|ايار|حزيران|تموز|آب|أيلول|ايلول|تشرين الأول|تشرين الثاني|كانون الأول|January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec';
const monthOf = (w: string) => MONTHS.find(([r]) => r.test(w))?.[1] || 0;

/** All dates in a line, in order of appearance. */
export function datesIn(line: string, fallbackYear?: number): string[] {
  const t = latin(line);
  const found: { at: number; v: string }[] = [];
  for (const m of t.matchAll(/\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/g)) { const v = iso(+m[1], +m[2], +m[3]); if (v) found.push({ at: m.index!, v }); }
  for (const m of t.matchAll(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})\b/g)) { const v = iso(+m[3], +m[2], +m[1]); if (v) found.push({ at: m.index!, v }); }
  const re1 = new RegExp(`(?<!\\d)(\\d{1,2})(?:\\s*(?:-|–|إلى|الى|to)\\s*(\\d{1,2}))?\\s+(?:من\\s+)?(${MONTH_WORDS})[,،]?\\s*(\\d{4})?(?!\\d)`, 'gi');
  for (const m of t.matchAll(re1)) {
    const y = m[4] ? +m[4] : fallbackYear; const mo = monthOf(m[3]);
    if (!y || !mo) continue;
    const a = iso(y, mo, +m[1]); if (a) found.push({ at: m.index!, v: a });
    if (m[2]) { const b = iso(y, mo, +m[2]); if (b) found.push({ at: m.index! + 1, v: b }); }
  }
  const re2 = new RegExp(`(${MONTH_WORDS})\\s+(\\d{1,2})(?!\\d)(?:\\s*(?:-|–|to)\\s*(\\d{1,2})(?!\\d))?(?:st|nd|rd|th)?[,،]?\\s*(\\d{4})?(?!\\d)`, 'gi');
  for (const m of t.matchAll(re2)) {
    const y = m[4] ? +m[4] : fallbackYear; const mo = monthOf(m[1]);
    if (!y || !mo) continue;
    const a = iso(y, mo, +m[2]); if (a) found.push({ at: m.index!, v: a });
    if (m[3]) { const b = iso(y, mo, +m[3]); if (b) found.push({ at: m.index! + 1, v: b }); }
  }
  const seen = new Set<string>();
  return found.sort((a, b) => a.at - b.at).map((f) => f.v).filter((v) => !seen.has(v) && seen.add(v));
}

const PLACES: [RegExp, string, string][] = [
  [/الرياض|riyadh/i, 'الرياض', 'السعودية'], [/جدة|jeddah|jiddah/i, 'جدة', 'السعودية'], [/الدمام|dammam/i, 'الدمام', 'السعودية'], [/الخبر|khobar/i, 'الخبر', 'السعودية'],
  [/العلا|alula|al-ula/i, 'العلا', 'السعودية'], [/مكة|makkah|mecca/i, 'مكة', 'السعودية'], [/المدينة المنورة|madinah|medina/i, 'المدينة المنورة', 'السعودية'], [/أبها|ابها|abha/i, 'أبها', 'السعودية'], [/الظهران|dhahran/i, 'الظهران', 'السعودية'],
  [/دبي|dubai/i, 'دبي', 'الإمارات'], [/أبوظبي|ابوظبي|abu dhabi/i, 'أبوظبي', 'الإمارات'], [/الشارقة|sharjah/i, 'الشارقة', 'الإمارات'],
  [/القاهرة|cairo/i, 'القاهرة', 'مصر'], [/الإسكندرية|الاسكندرية|alexandria/i, 'الإسكندرية', 'مصر'], [/الجونة|el gouna|gouna/i, 'الجونة', 'مصر'],
  [/عمّان|عمان|amman/i, 'عمّان', 'الأردن'], [/بيروت|beirut/i, 'بيروت', 'لبنان'], [/الدوحة|doha/i, 'الدوحة', 'قطر'], [/الكويت|kuwait/i, 'الكويت', 'الكويت'],
  [/المنامة|manama|bahrain|البحرين/i, 'المنامة', 'البحرين'], [/مسقط|muscat/i, 'مسقط', 'عُمان'], [/تونس|tunis/i, 'تونس', 'تونس'], [/الرباط|rabat/i, 'الرباط', 'المغرب'],
  [/مراكش|marrakech|marrakesh/i, 'مراكش', 'المغرب'], [/الدار البيضاء|casablanca/i, 'الدار البيضاء', 'المغرب'], [/الجزائر|algiers/i, 'الجزائر', 'الجزائر'], [/بغداد|baghdad/i, 'بغداد', 'العراق'],
];
const COUNTRIES: [RegExp, string][] = [[/السعودية|saudi/i, 'السعودية'], [/الإمارات|الامارات|uae|emirates/i, 'الإمارات'], [/مصر|egypt/i, 'مصر'], [/الأردن|الاردن|jordan/i, 'الأردن'], [/لبنان|lebanon/i, 'لبنان'], [/قطر|qatar/i, 'قطر'], [/المغرب|morocco/i, 'المغرب'], [/تونس|tunisia/i, 'تونس']];

const clean = (s: string) => s.replace(/^[\s•●▪◦\-–—*·\d.)(]+/, '').replace(/\s+/g, ' ').trim();
const END = '(?=$|[\\s:：])';
const HEAD = { cats: new RegExp(`^(الأقسام|الاقسام|الفئات|أقسام المسابقة|فئات المسابقة|المسابقات|فئات الجوائز|categories|competition sections|sections|award categories)${END}`, 'i'),
  rules: new RegExp(`^(الشروط|شروط المشاركة|الشروط والأحكام|شروط التقديم|شروط الأهلية|الأهلية|rules|eligibility|requirements|terms|submission guidelines)${END}`, 'i'),
  crit: new RegExp(`^(معايير التحكيم|معايير التقييم|المعايير|judging criteria|evaluation criteria|criteria)${END}`, 'i'),
  dates: new RegExp(`^(المواعيد|المواعيد المهمة|التواريخ|مواعيد مهمة|التواريخ المهمة|الجدول الزمني|important dates|key dates|timeline|deadlines)${END}`, 'i') };
const STOP = /^(للتواصل|التواصل|تواصل|رسوم|الرسوم|contact|entry fee|fees?|email|website|الموقع)\b|@|https?:\/\/|www\./i;
/** Undo the lam-alef swap some PDF text layers produce ("األحمر" → "الأحمر"). */
const SWAPS: [RegExp, string][] = [[/أفالم/g, 'أفلام'], [/خالل/g, 'خلال'], [/إعالن/g, 'إعلان'], [/اإلعالن/g, 'الإعلان'], [/(^|\s)بال(?=\s)/g, '$1بلا'], [/(^|\s)إال(?=\s)/g, '$1إلا'], [/(^|\s)ال(?=\s)/g, '$1لا'], [/الطالب(?=\s|$)/g, 'الطلاب'], [/لطالب(?=\s)/g, 'لطلاب'], [/مجا\s*ن[ًا]*/g, 'مجانًا']];
export const fixArabicPdf = (t: string) => SWAPS.reduce((acc, [r, v]) => acc.replace(r, v), t.replace(/ا([أإآ])ل/g, 'ال$1').replace(/ل([أإآ])ل/g, 'لل$1'));

/** Built-in reader for when no AI key is configured. */
export function readFestivalText(text: string, fileName = ''): FestivalDraft {
  const lines = fixArabicPdf(text).split(/\r?\n/).map((l) => l.replace(/\s+/g, ' ').trim()).filter((l) => l && !/^--- (صفحة|شريحة) \d+ ---$/.test(l));
  const all = latin(lines.join('\n'));
  const year = Number((all.match(/\b(20[2-4]\d)\b/) || [])[1]) || new Date().getFullYear();
  const found: string[] = [];

  const name = lines.find((l) => /مهرجان|festival/i.test(l) && l.length <= 90) || lines.find((l) => l.length >= 4 && l.length <= 70) || fileName.replace(/\.[^.]+$/, '');
  if (name) found.push('name');

  let section: keyof typeof HEAD | null = null;
  const bucket: Record<keyof typeof HEAD, string[]> = { cats: [], rules: [], crit: [], dates: [] };
  for (const l of lines) {
    const h = (Object.keys(HEAD) as (keyof typeof HEAD)[]).find((k) => HEAD[k].test(l.replace(/[:：]$/, '')) && l.length < 60);
    if (h) { section = h; const rest = l.split(/[:：]/).slice(1).join(':').trim(); if (rest) bucket[h].push(rest); continue; }
    if (section && STOP.test(l)) { section = null; continue; }
    if (section && datesIn(l, 2000).length && section !== 'dates') { section = null; }
    if (section && l.length < 200) bucket[section].push(l);
    if (section && bucket[section].length > 14) section = null;
  }

  const dated = (re: RegExp) => { for (const l of lines) if (re.test(l)) { const d = datesIn(l, year); if (d.length) return d; } return [] as string[]; };
  const open = dated(/فتح باب|يفتح|بدء التقديم|بداية التقديم|استقبال المشاركات|submissions? open|opens?\b|call for entries/i)[0] || null;
  const close = dated(/آخر موعد|اخر موعد|إغلاق|اغلاق|ينتهي التقديم|نهاية التقديم|deadline|close[sd]?\b/i).slice(-1)[0] || null;
  const review = dated(/التحكيم|لجنة|jury|judging|review/i).slice(-1)[0] || null;
  const results = dated(/إعلان|اعلان|النتائج|الفائزين|results|winners|announce/i)[0] || null;
  const fest = dated(/يقام|تقام|موعد المهرجان|أيام المهرجان|خلال الفترة|festival (?:dates|runs|takes place)|held (?:on|from)|from\b/i);
  const starts = fest[0] || null; const ends = fest[1] || null;
  for (const [k, v] of Object.entries({ submissions_open: open, submissions_close: close, review_deadline: review, results_on: results, starts_on: starts })) if (v) found.push(k);

  const place = PLACES.find(([r]) => r.test(all));
  const country = place?.[2] || COUNTRIES.find(([r]) => r.test(all))?.[1] || null;
  if (place) found.push('city');

  const di = lines.findIndex((l) => l.split(' ').length >= 12 && !HEAD.rules.test(l));
  let description: string | null = di >= 0 ? lines[di] : null;
  for (let k = di + 1; description && k < lines.length && k < di + 4 && !/[.!؟?]$/.test(description); k++) {
    if (lines[k].length < 18 || Object.values(HEAD).some((h) => h.test(lines[k])) || datesIn(lines[k], 2000).length) break;
    description += ' ' + lines[k];
  }
  if (description) found.push('description');

  let cats = bucket.cats.map(clean).filter((l) => l.length >= 3 && l.length <= 120);
  if (!cats.length) cats = lines.filter((l) => /^(قسم|فئة|مسابقة)\s|(?:category|competition)\s*[:\-]/i.test(l)).map(clean);
  const categories = cats.slice(0, 10).map((l) => {
    const [n, ...rest] = l.split(/\s*[:：–—-]\s+|\s*\(\s*/);
    const desc = (rest.join(' ').replace(/\)$/, '') || (l.match(/(أقل|أكثر|حتى|لا يتجاوز|under|over|up to|less than|more than)[^،,.]*/i)?.[0] ?? '')).trim();
    const fee = (l.match(/(مجان[ًا]*|free|\$\s*\d+|\d+\s*(ريال|ر\.س|SAR|USD|\$|دولار|درهم|AED))/i) || [])[0] || null;
    const d2 = fee ? desc.replace(fee, '').replace(/[\s\-–—·,،]+$/, '').trim() : desc;
    return { name: n.replace(/^(قسم|فئة)\s+/, '').trim().slice(0, 60), description: d2 ? d2.slice(0, 120) : null, fee: fee ? fee.replace(/^مجان[ًا]*$/, 'مجانًا') : null };
  }).filter((c) => c.name.length >= 2);
  if (categories.length) found.push('categories');

  const rules = (bucket.rules.length ? bucket.rules : lines.filter((l) => /^(يجب|لا يقبل|لا تقبل|يشترط|أن يكون|ألا|must|should|films? (?:must|should)|only)/i.test(l))).map(clean).filter((l) => l.length >= 8 && l.length <= 220).slice(0, 12);
  if (rules.length) found.push('rules');

  const crit = bucket.crit.map(clean).filter((l) => /[%%]/.test(latin(l)) || (l.length <= 40 && !/[:：]/.test(l))).map((l) => { const w = Number(latin(l).match(/(\d{1,3})\s*[%%]/)?.[1] || 0); return { name: l.replace(/[\d٠-٩]+\s*[%%]/, '').replace(/[:：\-–()]+\s*$/, '').trim().slice(0, 40), weight: w }; }).filter((c) => c.name.length >= 2).slice(0, 8);
  if (crit.length) { const missing = crit.filter((c) => !c.weight).length; const left = 100 - crit.reduce((s, c) => s + c.weight, 0); crit.forEach((c) => { if (!c.weight) c.weight = Math.max(5, Math.round(left / Math.max(1, missing))); }); found.push('criteria'); }

  const fee = lines.find((l) => /رسوم|fee/i.test(l)) || null;
  const email = (text.match(/[\w.+-]+@[\w-]+\.[\w.]+/) || [])[0] || null;
  const site = (text.match(/https?:\/\/[^\s)]+|www\.[^\s)]+/i) || [])[0] || null;

  return {
    name: name.slice(0, 90), slug: slugFrom(name), city: place?.[1] || null, country, description: description?.slice(0, 500) || null,
    starts_on: starts, ends_on: ends, submissions_open: open, submissions_close: close, review_deadline: review, results_on: results,
    fee_note: fee ? clean(fee.split(/[:：]/).slice(-1)[0]).slice(0, 80) : null, rules, categories, criteria: crit,
    contact_email: email, website: site, highlights: [], found, model: 'nas-reader',
  };
}

const D = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
const S = (v: unknown, n: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : null);

async function withClaude(doc: DocIn): Promise<FestivalDraft | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const client = new Anthropic({ apiKey: key });
  const today = new Date().toISOString().slice(0, 10);
  const prompt = `أنت مساعد يجهّز مهرجانًا سينمائيًا على منصة NAS من وثيقة رفعها المنظم (${doc.name}). اليوم ${today}.
اقرأ الوثيقة كاملة واستخرج كل ما يخص المهرجان بدقة. لا تخترع معلومات غير موجودة؛ اترك الحقل null أو القائمة فارغة إن لم يُذكر.
- التواريخ بصيغة YYYY-MM-DD. إن ذُكر اليوم والشهر دون السنة فاستنتج السنة الأقرب منطقيًا.
- الأقسام: كل فئة/مسابقة يمكن التقديم عليها، مع وصف قصير يذكر شرط المدة أو الأهلية إن وُجد، والرسوم إن ذُكرت.
- الشروط: جمل قصيرة واضحة بالعربية (ترجم إن كانت الوثيقة بالإنجليزية).
- معايير التحكيم بأوزان مجموعها 100 (وزّعها بالتساوي إن لم تُذكر الأوزان). إن لم تُذكر معايير فاتركها فارغة.
- الاسم بالعربية إن وُجد، و name_en بالإنجليزية إن وُجد.
- highlights: حتى 4 نقاط لافتة من الوثيقة (جوائز، ضيوف، أرقام) تفيد المنظم.
أعد JSON فقط:
{"name": "", "name_en": "", "city": "", "country": "", "description": "نبذة من سطرين إلى ثلاثة",
"starts_on": null, "ends_on": null, "submissions_open": null, "submissions_close": null, "review_deadline": null, "results_on": null,
"fee_note": "", "rules": [], "categories": [{"name": "", "description": "", "fee": ""}], "criteria": [{"name": "", "weight": 25}],
"contact_email": null, "website": null, "highlights": []}`;
  type Block = { type: 'text'; text: string } | { type: 'document'; source: { type: 'base64'; media_type: 'application/pdf'; data: string } } | { type: 'image'; source: { type: 'base64'; media_type: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'; data: string } };
  const content: Block[] = [];
  if (doc.file?.media_type === 'application/pdf') content.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: doc.file.data } });
  else if (doc.file && /^image\//.test(doc.file.media_type)) content.push({ type: 'image', source: { type: 'base64', media_type: doc.file.media_type as 'image/png', data: doc.file.data } });
  if (doc.text.trim()) content.push({ type: 'text', text: `نص الوثيقة:\n${doc.text.slice(0, 90_000)}` });
  content.push({ type: 'text', text: prompt });
  const models = [process.env.ANTHROPIC_DOC_MODEL || 'claude-sonnet-4-5', process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001'];
  const started = Date.now();
  for (const model of models) {
    const left = 52_000 - (Date.now() - started);
    if (left < 12_000) break; // stay inside the 60s function limit
    try {
      const msg = await client.messages.create({ model, max_tokens: 3000, messages: [{ role: 'user', content }] }, { timeout: left, maxRetries: 0 });
      const t = msg.content.map((b) => ('text' in b ? b.text : '')).join('');
      const j = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1));
      const name = S(j.name, 90) || S(j.name_en, 90) || doc.name.replace(/\.[^.]+$/, '');
      const cats = Array.isArray(j.categories) ? j.categories.map((c: Record<string, unknown>) => ({ name: S(c.name, 60) || '', description: S(c.description, 140), fee: S(c.fee, 40) })).filter((c: { name: string }) => c.name).slice(0, 12) : [];
      let crit = Array.isArray(j.criteria) ? j.criteria.map((c: Record<string, unknown>) => ({ name: S(c.name, 40) || '', weight: Math.max(0, Math.round(Number(c.weight) || 0)) })).filter((c: { name: string }) => c.name).slice(0, 8) : [];
      const sum = crit.reduce((s: number, c: { weight: number }) => s + c.weight, 0);
      if (crit.length && sum !== 100) crit = crit.map((c: { name: string; weight: number }) => ({ ...c, weight: sum ? Math.round((c.weight / sum) * 100) : Math.round(100 / crit.length) }));
      const draft: FestivalDraft = {
        name, slug: slugFrom(S(j.name_en, 90) || name), city: S(j.city, 60), country: S(j.country, 60), description: S(j.description, 600),
        starts_on: D(j.starts_on), ends_on: D(j.ends_on), submissions_open: D(j.submissions_open), submissions_close: D(j.submissions_close), review_deadline: D(j.review_deadline), results_on: D(j.results_on),
        fee_note: S(j.fee_note, 80), rules: Array.isArray(j.rules) ? j.rules.map((r: unknown) => S(r, 240)).filter(Boolean).slice(0, 15) as string[] : [],
        categories: cats, criteria: crit, contact_email: S(j.contact_email, 120), website: S(j.website, 200),
        highlights: Array.isArray(j.highlights) ? j.highlights.map((r: unknown) => S(r, 200)).filter(Boolean).slice(0, 4) as string[] : [], found: [], model,
      };
      draft.found = (['name', 'city', 'description', 'submissions_open', 'submissions_close', 'review_deadline', 'results_on', 'starts_on', 'categories', 'rules', 'criteria'] as const)
        .filter((k) => { const v = draft[k]; return Array.isArray(v) ? v.length > 0 : !!v; });
      return draft;
    } catch (e) { console.error('festival extraction failed with', model, e); }
  }
  return null;
}

export async function extractFestival(doc: DocIn): Promise<FestivalDraft & { ai: boolean }> {
  const ai = await withClaude(doc);
  if (ai) return { ...ai, ai: true };
  return { ...readFestivalText(doc.text, doc.name), ai: false };
}
