const toLatin = (s: string) => s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

/** Reads duration rules from a category description: "أقل من ٤٠ دقيقة" / "over 60 minutes". */
export function durationRule(desc?: string | null): { min?: number; max?: number } {
  if (!desc) return {};
  const t = toLatin(desc);
  const n = Number((t.match(/(\d+)/) || [])[1]);
  if (!n) return {};
  if (/أقل|حتى|لا يتجاوز|under|less|up to|max/i.test(t)) return { max: n };
  if (/أكثر|فوق|over|more|min/i.test(t)) return { min: n };
  return {};
}
