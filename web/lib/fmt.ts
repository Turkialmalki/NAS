const AR = '٠١٢٣٤٥٦٧٨٩';
export const ar = (v: string | number | null | undefined) =>
  v == null ? '—' : String(v).replace(/\d/g, (d) => AR[+d]).replace(/\./g, '٫');

const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
export const date = (d?: string | null) => {
  if (!d) return '—';
  const x = new Date(d);
  return `${ar(x.getDate())} ${MONTHS[x.getMonth()]} ${ar(x.getFullYear())}`;
};
export const dateShort = (d?: string | null) => {
  if (!d) return '—';
  const x = new Date(d);
  return `${ar(x.getDate())} ${MONTHS[x.getMonth()]}`;
};
export const ago = (d: string) => {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return 'الآن';
  if (s < 3600) return `قبل ${ar(Math.round(s / 60))} د`;
  if (s < 86400) return `قبل ${ar(Math.round(s / 3600))} س`;
  if (s < 172800) return 'أمس';
  return dateShort(d);
};
export const daysLeft = (d?: string | null) => (d ? Math.max(0, Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)) : null);

export const STATUS: Record<string, [string, string]> = {
  uploaded: ['مرفوع', 'c-mute'],
  processing: ['قيد المعالجة', 'c-info'],
  analyzed: ['تم التحليل', 'c-vio'],
  reviewed: ['تمت المراجعة', 'c-ok'],
};
export const DECISION: Record<string, [string, string, string]> = {
  pending: ['بانتظار القرار', 'c-mute', 'var(--ink2)'],
  shortlisted: ['قائمة قصيرة', 'c-acc', 'var(--acc)'],
  accepted: ['مقبول', 'c-ok', 'var(--ok)'],
  declined: ['معتذر', 'c-no', 'var(--no)'],
};
export const ROLE: Record<string, string> = { owner: 'مالك المهرجان', manager: 'مدير', programmer: 'مبرمج', reviewer: 'محكّم' };
export const code = (ref: string) => ref.replace(/^NAS-\d{4}-0*/, 'NAS-').replace(/^NAS-(\d{1,3})$/, (_, n) => 'NAS-' + n.padStart(4, '0'));
