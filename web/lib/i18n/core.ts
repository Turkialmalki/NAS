// Bilingual core. Arabic is the source language: every UI string is written in Arabic and
// looked up in the English dictionary when the interface is in English. Missing entries fall
// back to Arabic, so nothing ever renders blank.
import { EN } from './en';

export type Lang = 'ar' | 'en';
export const LANGS: Lang[] = ['ar', 'en'];
export const LANG_COOKIE = 'nas_lang';

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const MONTHS: Record<Lang, string[]> = {
  ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};
const DAYS: Record<Lang, string[]> = {
  ar: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};

export type T = ((s: string, vars?: Record<string, string | number | null | undefined>) => string) & {
  lang: Lang; dir: 'rtl' | 'ltr';
  /** number with the right digits */ n: (v: string | number | null | undefined) => string;
  date: (d?: string | null) => string; dateShort: (d?: string | null) => string; day: (d?: string | null) => string;
  time: (d?: string | null) => string; ago: (d: string) => string;
};

export function makeT(lang: Lang): T {
  const n = (v: string | number | null | undefined) => (v == null ? '—' : lang === 'ar' ? String(v).replace(/\d/g, (d) => AR_DIGITS[+d]).replace(/\./g, '٫') : String(v));
  const fill = (s: string, vars?: Record<string, string | number | null | undefined>) =>
    vars ? s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] == null ? '' : typeof vars[k] === 'number' ? n(vars[k] as number) : String(vars[k]))) : s;
  const t = ((s: string, vars?: Record<string, string | number | null | undefined>) => fill(lang === 'en' ? EN[s] ?? s : s, vars)) as T;
  t.lang = lang; t.dir = lang === 'ar' ? 'rtl' : 'ltr'; t.n = n;
  t.date = (d) => { if (!d) return '—'; const x = new Date(d); return lang === 'ar' ? `${n(x.getDate())} ${MONTHS.ar[x.getMonth()]} ${n(x.getFullYear())}` : `${MONTHS.en[x.getMonth()]} ${x.getDate()}, ${x.getFullYear()}`; };
  t.dateShort = (d) => { if (!d) return '—'; const x = new Date(d); return lang === 'ar' ? `${n(x.getDate())} ${MONTHS.ar[x.getMonth()]}` : `${MONTHS.en[x.getMonth()]} ${x.getDate()}`; };
  t.day = (d) => { if (!d) return '—'; const x = new Date(d); return `${DAYS[lang][x.getDay()]} ${t.dateShort(d)}`; };
  t.time = (d) => { if (!d) return '—'; const x = new Date(d); const h = x.getHours(), m = String(x.getMinutes()).padStart(2, '0'); return lang === 'ar' ? n(`${h}:${m}`) : `${((h + 11) % 12) + 1}:${m} ${h < 12 ? 'AM' : 'PM'}`; };
  t.ago = (d) => {
    const s = (Date.now() - new Date(d).getTime()) / 1000;
    if (s < 60) return t('الآن');
    if (s < 3600) return t('قبل {n} د', { n: Math.round(s / 60) });
    if (s < 86400) return t('قبل {n} س', { n: Math.round(s / 3600) });
    if (s < 172800) return t('أمس');
    return t.dateShort(d);
  };
  return t;
}
