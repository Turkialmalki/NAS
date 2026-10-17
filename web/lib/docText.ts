'use client';
// Reads the text out of a festival document in the browser: PDF, PowerPoint, Word, text.
// Images and scanned PDFs are passed on as files so the AI can read them visually.

export type DocPayload = { name: string; kind: 'pdf' | 'pptx' | 'docx' | 'text' | 'image'; text: string; pages: number; file?: { media_type: string; data: string } };

const MAX_INLINE = 2_800_000; // bytes we can forward to the server as base64

const toB64 = (buf: ArrayBuffer) => {
  let s = ''; const b = new Uint8Array(buf);
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
};
const decodeXml = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

async function pdfText(buf: ArrayBuffer) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf.slice(0)) }).promise;
  const out: string[] = [];
  for (let p = 1; p <= Math.min(doc.numPages, 60); p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    let line = ''; let lastY: number | null = null; const lines: string[] = [];
    for (const it of tc.items as { str: string; transform: number[]; hasEOL?: boolean }[]) {
      const y = Math.round(it.transform?.[5] ?? 0);
      if (lastY !== null && Math.abs(y - lastY) > 3) { if (line.trim()) lines.push(line.trim()); line = ''; }
      line += (line && !line.endsWith(' ') ? ' ' : '') + it.str;
      lastY = y;
      if (it.hasEOL) { if (line.trim()) lines.push(line.trim()); line = ''; lastY = null; }
    }
    if (line.trim()) lines.push(line.trim());
    out.push(`--- صفحة ${p} ---\n` + lines.join('\n'));
  }
  return { text: out.join('\n\n'), pages: doc.numPages };
}

async function zipXmlText(buf: ArrayBuffer, kind: 'pptx' | 'docx') {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(buf);
  if (kind === 'docx') {
    const xml = await zip.file('word/document.xml')?.async('string') || '';
    const paras = xml.split(/<\/w:p>/).map((p) => decodeXml([...p.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]).join('')).trim()).filter(Boolean);
    return { text: paras.join('\n'), pages: 1 };
  }
  const slides = Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));
  const out: string[] = [];
  for (const [i, n] of slides.entries()) {
    const xml = await zip.file(n)!.async('string');
    const paras = xml.split(/<\/a:p>/).map((p) => decodeXml([...p.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]).join('')).trim()).filter(Boolean);
    const notesName = `ppt/notesSlides/notesSlide${n.match(/\d+/)![0]}.xml`;
    const notes = zip.file(notesName) ? (await zip.file(notesName)!.async('string')).split(/<\/a:p>/).map((p) => decodeXml([...p.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]).join('')).trim()).filter((t) => t && !/^\d+$/.test(t)) : [];
    out.push(`--- شريحة ${i + 1} ---\n` + paras.join('\n') + (notes.length ? `\n(ملاحظات: ${notes.join(' ')})` : ''));
  }
  return { text: out.join('\n\n'), pages: slides.length };
}

export async function readDocument(file: File): Promise<DocPayload> {
  const name = file.name;
  const ext = (name.split('.').pop() || '').toLowerCase();
  const buf = await file.arrayBuffer();
  if (ext === 'pdf' || file.type === 'application/pdf') {
    const { text, pages } = await pdfText(buf);
    // the AI reads the PDF itself too (layout, tables, scanned pages, Arabic shaping) when it is small enough to send
    return { name, kind: 'pdf', text, pages, file: buf.byteLength <= MAX_INLINE ? { media_type: 'application/pdf', data: toB64(buf) } : undefined };
  }
  if (ext === 'pptx') return { name, kind: 'pptx', ...(await zipXmlText(buf, 'pptx')) };
  if (ext === 'docx') return { name, kind: 'docx', ...(await zipXmlText(buf, 'docx')) };
  if (/^(png|jpe?g|webp|gif)$/.test(ext) || file.type.startsWith('image/')) {
    const media_type = file.type || `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    if (buf.byteLength > MAX_INLINE) throw new Error('too_big');
    return { name, kind: 'image', text: '', pages: 1, file: { media_type, data: toB64(buf) } };
  }
  if (/^(txt|md|csv|json)$/.test(ext) || file.type.startsWith('text/')) return { name, kind: 'text', text: new TextDecoder().decode(buf), pages: 1 };
  if (ext === 'ppt' || ext === 'doc') throw new Error('old_format');
  throw new Error('unsupported');
}
