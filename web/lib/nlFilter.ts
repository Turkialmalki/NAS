// Natural-language filters (Arabic + English). Turns "وثائقيات سعودية أقل من ٣٠ دقيقة بدون محكّم"
// into structured filters shown as removable chips. Runs instantly in the browser; an AI pass on
// the server can refine it when an API key is configured.

export type FilmFilters = {
  genre?: string[]; minDur?: number; maxDur?: number; decision?: string[]; reviewed?: boolean; analyzed?: boolean;
  unassigned?: boolean; assigned?: boolean; minScore?: number; maxScore?: number; country?: string; language?: string;
  categoryId?: string; days?: number; unscheduled?: boolean; broken?: boolean; overdue?: boolean; text?: string[]; sort?: 'score' | 'new' | 'short';
};
export type FestFilters = { country?: string; city?: string; type?: string; free?: boolean; closingDays?: number; text?: string[] };
export type Chip = { key: string; label: string; vars?: Record<string, string | number> };

const toLatin = (s: string) => s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
const norm = (s: string) => toLatin(s).toLowerCase().replace(/[ًٌٍَُِّْـ]/g, '').replace(/[إأآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');

const GENRES: [RegExp, string][] = [
  [/وثائق|documentar|\bdocs?\b/, 'وثائقي'], [/روائي|دراما|درامي|fiction|drama|narrative/, 'روائي'],
  [/تحريك|انيميشن|انمي|رسوم متحرك|animat|cartoon/, 'تحريك'], [/تجريبي|experimental/, 'تجريبي'],
];
const COUNTRIES: [RegExp, string][] = [
  [/سعودي|السعوديه|saudi|ksa/, 'السعودية'], [/مصري|مصر|egypt/, 'مصر'], [/امارات|اماراتي|uae|emirat/, 'الإمارات'], [/اردن|اردني|jordan/, 'الأردن'],
  [/لبنان|لبناني|leban/, 'لبنان'], [/كويت|kuwait/, 'الكويت'], [/قطر|qatar/, 'قطر'], [/مغرب|morocc/, 'المغرب'], [/تونس|tunis/, 'تونس'], [/عراق|iraq/, 'العراق'],
];
const STOP = new Set(['افلام', 'فيلم', 'الافلام', 'اللي', 'التي', 'الذي', 'في', 'من', 'عن', 'مع', 'و', 'او', 'ذات', 'كل', 'لي', 'ابي', 'ابغى', 'ابغي', 'اعرض', 'اعطني', 'وريني', 'هات', 'show', 'me', 'films', 'film', 'movies', 'the', 'with', 'and', 'that', 'are', 'of', 'in', 'a', 'all', 'مهرجانات', 'مهرجان', 'festivals', 'festival', 'دقيقه', 'دقائق', 'بعد', 'فيها', 'فيه', 'لها', 'له', 'هذه', 'هذا', 'min', 'minutes', 'mins', 'اقل', 'اكثر', 'تحت', 'فوق', 'than', 'under', 'over', 'less', 'more']);

export function parseFilmQuery(q: string, cats: { id: string; name: string }[] = []): { f: FilmFilters; chips: Chip[] } {
  const s = norm(q);
  const f: FilmFilters = {}; const chips: Chip[] = [];
  let rest = ` ${s} `;
  const eat = (re: RegExp) => { rest = rest.replace(re, ' '); };

  for (const [re, g] of GENRES) if (re.test(s)) { (f.genre ||= []).push(g); chips.push({ key: `genre:${g}`, label: g }); eat(new RegExp(`(?:${re.source})\\S*`, 'g')); }

  // durations: "اقل من 30 دقيقه" / "under 30 min" / "between 20 and 40"
  const unit = '(?:\\s*(?:دقيقه|دقائق|د|minutes|mins|min|m)(?=\\s|$))?';
  let m = s.match(new RegExp(`(?:اقل من|تحت|حتي|لا تتجاوز|under|less than|below|shorter than|<)\\s*(\\d{1,3})${unit}`));
  const isDur = (x: RegExpMatchArray | null) => !!x && (+x[1] >= 15 || /(دقيق|دقائق|\sد(\s|$)|min)/.test(x[0]));
  if (!isDur(m)) m = null;
  if (m) { f.maxDur = +m[1]; chips.push({ key: 'maxDur', label: 'أقل من {n} دقيقة', vars: { n: +m[1] } }); eat(new RegExp(m[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))); }
  m = s.match(new RegExp(`(?:اكثر من|اطول من|فوق|over|more than|longer than|above|>)\\s*(\\d{1,3})${unit}`));
  if (!isDur(m)) m = null;
  if (m) { f.minDur = +m[1]; chips.push({ key: 'minDur', label: 'أكثر من {n} دقيقة', vars: { n: +m[1] } }); eat(new RegExp(m[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))); }
  if (!f.maxDur && /(?:^|\s)(قصير|قصيره|القصيره|قصار|short)(?:\s|$)/.test(s)) { f.maxDur = 40; chips.push({ key: 'maxDur', label: 'قصير (حتى ٤٠ دقيقة)' }); eat(/(قصير|قصيره|القصيره|قصار|short)/g); }
  if (!f.minDur && /(?:^|\s)(طويل|طويله|الطويله|feature|long)(?:\s|$)/.test(s)) { f.minDur = 60; chips.push({ key: 'minDur', label: 'طويل (أكثر من ٦٠ دقيقة)' }); eat(/(طويل|طويله|الطويله|feature|long)/g); }

  // scores
  m = s.match(/(?:تقييم\S*|درج\S*|score|rated|rating)\s*(?:اعلي من|اكثر من|فوق|above|over|more than|>=?|من)?\s*(\d+(?:\.\d)?)/) || s.match(/(?:اعلي من|فوق|above|over)\s*(\d(?:\.\d)?)\s*(?:تقييم|نقاط|score|\/10)/);
  if (m && +m[1] <= 10) { f.minScore = +m[1]; chips.push({ key: 'minScore', label: 'التقييم {n}+', vars: { n: +m[1] } }); eat(new RegExp(m[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))); }
  if (/(الاعلي تقييم|افضل|الافضل|top rated|best|highest)/.test(s)) { f.sort = 'score'; chips.push({ key: 'sort', label: 'الأعلى تقييمًا' }); eat(/(الاعلي تقييما?|افضل|الافضل|top rated|best|highest)/g); }
  if (/(الاحدث|احدث|newest|latest|recent)/.test(s)) { f.sort = 'new'; chips.push({ key: 'sort', label: 'الأحدث' }); eat(/(الاحدث|احدث|newest|latest|recent)/g); }

  // jury / workflow
  if (/(بدون محكم|بلا محكم|ما لها محكم|لم تسند|غير مسند|بدون اسناد|unassigned|no reviewer|not assigned|without reviewer)/.test(s)) { f.unassigned = true; chips.push({ key: 'unassigned', label: 'بدون محكّم' }); eat(/(بدون محكم\S*|بلا محكم\S*|ما لها محكم\S*|لم تسند|غير مسند\S*|بدون اسناد|unassigned|no reviewers?|not assigned|without reviewers?)/g); }
  else if (/(مسنده|اسندت|assigned)/.test(s)) { f.assigned = true; chips.push({ key: 'assigned', label: 'مسندة لمحكّم' }); eat(/(مسنده|اسندت|assigned)/g); }
  if (/(تمت مراجعت|قيمها المحكم|اكتمل تقييم|reviewed|evaluated)/.test(s)) { f.reviewed = true; chips.push({ key: 'reviewed', label: 'اكتمل تقييمها' }); eat(/(تمت مراجعت\S*|قيمها المحكم\S*|اكتمل تقييم\S*|reviewed|evaluated)/g); }
  if (/(روابط? لا تعمل|رابط معطل|روابط معطله|رابط خربان|broken link|dead link|bad link)/.test(s)) { f.broken = true; chips.push({ key: 'broken', label: 'روابط لا تعمل' }); eat(/(روابط? لا تعمل|رابط معطل|روابط معطله|رابط خربان|broken links?|dead links?|bad links?)/g); }
  if (/(متاخر|تجاوز الموعد|overdue|late)/.test(s)) { f.overdue = true; chips.push({ key: 'overdue', label: 'تقييم متأخر' }); eat(/(متاخر\S*|تجاوز الموعد|overdue|late)/g); }
  if (/(لم تحلل|بدون تحليل|not analy|unanalyzed)/.test(s)) { f.analyzed = false; chips.push({ key: 'analyzed', label: 'لم تُحلَّل' }); eat(/(لم تحلل|بدون تحليل|not analy\S*|unanalyzed)/g); }
  const dec: [RegExp, string, string][] = [[/(مقبول|مقبوله|المقبوله|اختيرت|accepted|selected)/, 'accepted', 'مقبولة'], [/(معتذر|مرفوض|مرفوضه|declined|rejected)/, 'declined', 'معتذر عنها'],
    [/(قائمه قصيره|القائمه القصيره|shortlist)/, 'shortlisted', 'القائمة القصيرة'], [/(بانتظار القرار|بدون قرار|لم يقرر|pending|undecided)/, 'pending', 'بانتظار القرار']];
  for (const [re, k, l] of dec) if (re.test(s)) { (f.decision ||= []).push(k); chips.push({ key: `decision:${k}`, label: l }); eat(new RegExp(`(?:${re.source})\\S*`, 'g')); }
  if (/(لم تجدول|غير مجدول|بدون جدول|not scheduled|unscheduled)/.test(s)) { f.unscheduled = true; chips.push({ key: 'unscheduled', label: 'لم تُجدول بعد' }); eat(/(لم تجدول|غير مجدول\S*|بدون جدول|not scheduled|unscheduled)/g); }
  if (/(هذا الاسبوع|الاسبوع|this week)/.test(s)) { f.days = 7; chips.push({ key: 'days', label: 'هذا الأسبوع' }); eat(/(هذا الاسبوع|الاسبوع|this week)/g); }
  else if (/(اليوم|today)/.test(s)) { f.days = 1; chips.push({ key: 'days', label: 'اليوم' }); eat(/(اليوم|today)/g); }

  for (const [re, c] of COUNTRIES) if (re.test(s)) { f.country = c; chips.push({ key: 'country', label: c }); eat(new RegExp(`(?:${re.source})\\S*`, 'g')); break; }
  if (/(بالعربي|العربيه|عربي|arabic)/.test(s)) { f.language = 'العربية'; chips.push({ key: 'language', label: 'بالعربية' }); eat(/(بالعربي\S*|العربيه|عربي\S*|arabic)/g); }
  else if (/(انجليزي|بالانجليزي|english)/.test(s)) { f.language = 'الإنجليزية'; chips.push({ key: 'language', label: 'بالإنجليزية' }); eat(/(انجليزي\S*|بالانجليزي\S*|english)/g); }

  for (const c of cats) { const n = norm(c.name); if (n.length > 2 && s.includes(n)) { f.categoryId = c.id; chips.push({ key: 'category', label: c.name }); eat(new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')); break; } }

  const words = rest.split(/\s+/).map((w) => w.replace(/^(ال|و|ب|ل)(?=\S{3,})/, '').replace(/[؟?.,،!]/g, '')).filter((w) => w.length > 2 && !STOP.has(w) && !/^\d+$/.test(w));
  if (words.length) { f.text = words; chips.push({ key: 'text', label: '«{w}»', vars: { w: words.join(' ') } }); }
  return { f, chips };
}

export type FilmLike = {
  title: string; synopsis: string | null; genre: string | null; duration_min: number | null; country: string | null; language: string | null;
  status: string; decision: string; category_id: string | null; created_at: string; director_name?: string;
  analysis: { score: number | null; themes: string[]; tone: string[]; checks?: { ok: boolean; text: string }[] } | null;
  assignments: { reviewer_id: string; due_at?: string | null }[]; reviews?: { reviewer_id: string }[]; scheduled?: boolean;
};
export function applyFilmFilters<T extends FilmLike>(list: T[], f: FilmFilters): T[] {
  let out = list.filter((x) => {
    if (f.genre?.length && !f.genre.some((g) => (x.genre || '').includes(g))) return false;
    if (f.maxDur != null && !(x.duration_min && x.duration_min <= f.maxDur)) return false;
    if (f.minDur != null && !(x.duration_min && x.duration_min >= f.minDur)) return false;
    if (f.decision?.length && !f.decision.includes(x.decision)) return false;
    if (f.reviewed && x.status !== 'reviewed') return false;
    if (f.analyzed === false && x.analysis) return false;
    if (f.unassigned && x.assignments.length) return false;
    if (f.assigned && !x.assignments.length) return false;
    const sc = x.analysis?.score != null ? Number(x.analysis.score) : null;
    if (f.minScore != null && !(sc != null && sc >= f.minScore)) return false;
    if (f.maxScore != null && !(sc != null && sc <= f.maxScore)) return false;
    if (f.country && !(x.country || '').includes(f.country)) return false;
    if (f.language && !(x.language || '').includes(f.language)) return false;
    if (f.categoryId && x.category_id !== f.categoryId) return false;
    if (f.days && Date.now() - new Date(x.created_at).getTime() > f.days * 86400000) return false;
    if (f.unscheduled && (x.decision !== 'accepted' || x.scheduled)) return false;
    if (f.broken && !(x.analysis?.checks || []).some((c) => !c.ok && /رابط|link/i.test(c.text))) return false;
    if (f.overdue && !x.assignments.some((a) => a.due_at && new Date(a.due_at).getTime() < Date.now() && !x.reviews?.some((r) => r.reviewer_id === a.reviewer_id))) return false;
    if (f.text?.length) {
      const hay = norm([x.title, x.synopsis, x.director_name, x.genre, x.country, ...(x.analysis?.themes || []), ...(x.analysis?.tone || [])].join(' '));
      if (!f.text.every((w) => hay.includes(norm(w)))) return false;
    }
    return true;
  });
  if (f.sort === 'score') out = [...out].sort((a, b) => (Number(b.analysis?.score) || 0) - (Number(a.analysis?.score) || 0));
  if (f.sort === 'new') out = [...out].sort((a, b) => b.created_at.localeCompare(a.created_at));
  return out;
}

export function removeChip<T extends Record<string, unknown>>(f: T, key: string): T {
  const n = { ...f } as Record<string, unknown>;
  const [k, v] = key.split(':');
  if (v && Array.isArray(n[k])) { n[k] = (n[k] as string[]).filter((x) => x !== v); if (!(n[k] as string[]).length) delete n[k]; }
  else if (k === 'category') delete n.categoryId;
  else delete n[k];
  return n as T;
}

/* ---------------------------------------------------------------- festivals */
export function parseFestQuery(q: string): { f: FestFilters; chips: Chip[] } {
  const s = norm(q);
  const f: FestFilters = {}; const chips: Chip[] = [];
  let rest = ` ${s} `;
  const eat = (re: RegExp) => { rest = rest.replace(re, ' '); };
  const types: [RegExp, string, string][] = [[/(قصير|قصيره|short)/, 'قصير', 'أفلام قصيرة'], [/(وثائق|documentar)/, 'وثائق', 'وثائقي'], [/(تحريك|انيميشن|animat)/, 'تحريك', 'تحريك'],
    [/(طويل|feature)/, 'طويل', 'أفلام طويلة'], [/(طلاب|طالب|student)/, 'طلاب', 'أفلام الطلاب'], [/(الفيلم الاول|اول فيلم|first film|debut)/, 'الأول', 'الفيلم الأول']];
  for (const [re, k, l] of types) if (re.test(s)) { f.type = k; chips.push({ key: 'type', label: l }); eat(new RegExp(`(?:${re.source})\\S*`, 'g')); break; }
  for (const [re, c] of COUNTRIES) if (re.test(s)) { f.country = c; chips.push({ key: 'country', label: c }); eat(new RegExp(`(?:${re.source})\\S*`, 'g')); break; }
  const cities: [RegExp, string][] = [[/رياض|riyadh/, 'الرياض'], [/جده|jeddah/, 'جدة'], [/دمام|dammam/, 'الدمام'], [/العلا|alula/, 'العلا'], [/دبي|dubai/, 'دبي'], [/قاهره|cairo/, 'القاهرة'], [/دوحه|doha/, 'الدوحة'], [/عمان|amman/, 'عمّان']];
  for (const [re, c] of cities) if (re.test(s)) { f.city = c; chips.push({ key: 'city', label: c }); eat(new RegExp(`(?:${re.source})\\S*`, 'g')); break; }
  if (/(مجاني|مجانا|بدون رسوم|free)/.test(s)) { f.free = true; chips.push({ key: 'free', label: 'مجاني' }); eat(/(مجاني\S*|مجانا|بدون رسوم|free)/g); }
  if (/(هذا الشهر|this month)/.test(s)) { f.closingDays = 31; chips.push({ key: 'closingDays', label: 'يغلق خلال شهر' }); eat(/(هذا الشهر|this month|يغلق|يقفل|closing|closes)/g); }
  else if (/(هذا الاسبوع|this week|قريبا|soon)/.test(s)) { f.closingDays = 7; chips.push({ key: 'closingDays', label: 'يغلق خلال أسبوع' }); eat(/(هذا الاسبوع|this week|قريبا|soon|يغلق|يقفل|closing|closes)/g); }
  const words = rest.split(/\s+/).map((w) => w.replace(/^(ال|و|ب|ل)(?=\S{3,})/, '').replace(/[؟?.,،!]/g, '')).filter((w) => w.length > 2 && !STOP.has(w) && !/^(التقديم|تقديم|مفتوح\S*|open|submissions?)$/.test(w));
  if (words.length) { f.text = words; chips.push({ key: 'text', label: '«{w}»', vars: { w: words.join(' ') } }); }
  return { f, chips };
}

export type FestLike = { name: string; city: string | null; country: string | null; description: string | null; submissions_close: string | null; fee_note: string | null; categories: { name: string; description: string | null; fee: string | null }[] };
export function applyFestFilters<T extends FestLike>(list: T[], f: FestFilters): T[] {
  return list.filter((x) => {
    const catText = norm(x.categories.map((c) => `${c.name} ${c.description || ''}`).join(' '));
    if (f.type && !catText.includes(norm(f.type)) && !norm(x.name).includes(norm(f.type))) return false;
    if (f.country && !(x.country || '').includes(f.country)) return false;
    if (f.city && !(x.city || '').includes(f.city)) return false;
    if (f.free && !/مجان|free/i.test(`${x.fee_note} ${x.categories.map((c) => c.fee).join(' ')}`)) return false;
    if (f.closingDays && !(x.submissions_close && (new Date(x.submissions_close).getTime() - Date.now()) / 86400000 <= f.closingDays)) return false;
    if (f.text?.length) { const hay = norm(`${x.name} ${x.city} ${x.country} ${x.description} ${catText}`); if (!f.text.every((w) => hay.includes(norm(w)))) return false; }
    return true;
  });
}

/** Chips for any film filter object (from the parser, the AI, or manual pickers). */
export function filmChips(f: FilmFilters, cats: { id: string; name: string }[] = []): Chip[] {
  const c: Chip[] = [];
  const DEC: Record<string, string> = { accepted: 'مقبولة', declined: 'معتذر عنها', shortlisted: 'القائمة القصيرة', pending: 'بانتظار القرار' };
  f.genre?.forEach((g) => c.push({ key: `genre:${g}`, label: g }));
  if (f.maxDur != null) c.push({ key: 'maxDur', label: 'أقل من {n} دقيقة', vars: { n: f.maxDur } });
  if (f.minDur != null) c.push({ key: 'minDur', label: 'أكثر من {n} دقيقة', vars: { n: f.minDur } });
  f.decision?.forEach((d) => c.push({ key: `decision:${d}`, label: DEC[d] || d }));
  if (f.reviewed) c.push({ key: 'reviewed', label: 'اكتمل تقييمها' });
  if (f.analyzed === false) c.push({ key: 'analyzed', label: 'لم تُحلَّل' });
  if (f.unassigned) c.push({ key: 'unassigned', label: 'بدون محكّم' });
  if (f.assigned) c.push({ key: 'assigned', label: 'مسندة لمحكّم' });
  if (f.minScore != null) c.push({ key: 'minScore', label: 'التقييم {n}+', vars: { n: f.minScore } });
  if (f.maxScore != null) c.push({ key: 'maxScore', label: 'التقييم حتى {n}', vars: { n: f.maxScore } });
  if (f.country) c.push({ key: 'country', label: f.country });
  if (f.language) c.push({ key: 'language', label: f.language });
  if (f.categoryId) c.push({ key: 'category', label: cats.find((x) => x.id === f.categoryId)?.name || '—' });
  if (f.days) c.push({ key: 'days', label: f.days === 1 ? 'اليوم' : 'آخر {n} أيام', vars: { n: f.days } });
  if (f.unscheduled) c.push({ key: 'unscheduled', label: 'لم تُجدول بعد' });
  if (f.broken) c.push({ key: 'broken', label: 'روابط لا تعمل' });
  if (f.overdue) c.push({ key: 'overdue', label: 'تقييم متأخر' });
  if (f.sort === 'score') c.push({ key: 'sort', label: 'الأعلى تقييمًا' });
  if (f.sort === 'new') c.push({ key: 'sort', label: 'الأحدث' });
  if (f.text?.length) c.push({ key: 'text', label: '«{w}»', vars: { w: f.text.join(' ') } });
  return c;
}
export function festChips(f: FestFilters): Chip[] {
  const c: Chip[] = [];
  const TYPE: Record<string, string> = { 'قصير': 'أفلام قصيرة', 'وثائق': 'وثائقي', 'تحريك': 'تحريك', 'طويل': 'أفلام طويلة', 'طلاب': 'أفلام الطلاب', 'الأول': 'الفيلم الأول' };
  if (f.type) c.push({ key: 'type', label: TYPE[f.type] || f.type });
  if (f.country) c.push({ key: 'country', label: f.country });
  if (f.city) c.push({ key: 'city', label: f.city });
  if (f.free) c.push({ key: 'free', label: 'مجاني' });
  if (f.closingDays) c.push({ key: 'closingDays', label: f.closingDays <= 7 ? 'يغلق خلال أسبوع' : 'يغلق خلال شهر' });
  if (f.text?.length) c.push({ key: 'text', label: '«{w}»', vars: { w: f.text.join(' ') } });
  return c;
}
