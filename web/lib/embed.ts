export function embedUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const h = u.hostname.replace(/^www\./, '');
    if (h.includes('vimeo.com')) { const id = u.pathname.split('/').filter(Boolean).find((p) => /^\d+$/.test(p)); return id ? `https://player.vimeo.com/video/${id}` : null; }
    if (h === 'youtu.be') return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    if (h.includes('youtube.com')) { const id = u.searchParams.get('v') || u.pathname.split('/').pop(); return id ? `https://www.youtube.com/embed/${id}` : null; }
    if (h === 'drive.google.com') { const m = u.pathname.match(/\/d\/([^/]+)/); return m ? `https://drive.google.com/file/d/${m[1]}/preview` : null; }
  } catch { /* ignore */ }
  return null;
}
