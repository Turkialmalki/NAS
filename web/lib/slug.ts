/** URL-safe festival link from an Arabic or English name. */
const TR: Record<string, string> = { ا: 'a', أ: 'a', إ: 'i', آ: 'a', ب: 'b', ت: 't', ث: 'th', ج: 'j', ح: 'h', خ: 'kh', د: 'd', ذ: 'th', ر: 'r', ز: 'z', س: 's', ش: 'sh', ص: 's', ض: 'd', ط: 't', ظ: 'z', ع: 'a', غ: 'gh', ف: 'f', ق: 'q', ك: 'k', ل: 'l', م: 'm', ن: 'n', ه: 'h', و: 'w', ي: 'y', ى: 'a', ة: 'a', ء: '', ئ: 'e', ؤ: 'o' };
export function slugFrom(name: string) {
  const raw = name.replace(/[\u0640\u064B-\u0652«»"']/g, '').split(/\s+/).filter(Boolean);
  const kept = raw.filter((w) => !/^(ال)?مهرجان$|^festival$|^the$|^of$|^for$/i.test(w));
  const words = (kept.length ? kept : raw).slice(0, 5);
  let s = words.map((w) => (/[a-z0-9]/i.test(w) ? w : w.replace(/^ال(?=.{3,})/, 'al').split('').map((c) => TR[c] ?? (/[a-z0-9]/i.test(c) ? c : '')).join(''))).join('-');
  s = s.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 48).replace(/-$/, '');
  return s.length >= 3 ? s : `festival-${Math.random().toString(36).slice(2, 6)}`;
}

