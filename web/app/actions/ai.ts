'use server';
import type { FilmFilters, FestFilters } from '@/lib/nlFilter';

/** Optional AI pass for filters the instant parser didn't fully understand. Returns null without an API key. */
export async function aiFilter(q: string, kind: 'films' | 'festivals', cats: { id: string; name: string }[] = []): Promise<FilmFilters | FestFilters | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || !q.trim() || q.length > 400) return null;
  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const schema = kind === 'films'
      ? `{"genre": ["روائي"|"وثائقي"|"تحريك"|"تجريبي"], "minDur": number, "maxDur": number, "decision": ["pending"|"shortlisted"|"accepted"|"declined"], "reviewed": bool, "unassigned": bool, "assigned": bool, "minScore": 0-10, "maxScore": 0-10, "country": "اسم الدولة بالعربية", "language": "العربية"|"الإنجليزية", "categoryId": one of ${JSON.stringify(cats)}, "days": number, "unscheduled": bool, "broken": bool, "overdue": bool, "text": ["كلمات موضوعية للبحث في العنوان والملخص"], "sort": "score"|"new"}`
      : `{"country": "اسم الدولة بالعربية", "city": "اسم المدينة بالعربية", "type": "قصير"|"وثائق"|"تحريك"|"طويل"|"طلاب"|"الأول", "free": bool, "closingDays": number, "text": ["كلمات"]}`;
    const msg = await new Anthropic({ apiKey: key }).messages.create({
      model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001', max_tokens: 400,
      messages: [{ role: 'user', content: `حوّل طلب البحث التالي إلى فلاتر JSON بهذا الشكل فقط (احذف أي حقل غير مذكور): ${schema}\nالطلب: «${q}»\nأعد JSON فقط.` }],
    }, { timeout: 12000, maxRetries: 0 });
    const t = msg.content.map((b) => ('text' in b ? b.text : '')).join('');
    const j = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1));
    return j && typeof j === 'object' ? j : null;
  } catch { return null; }
}
