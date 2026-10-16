import { NextResponse } from 'next/server';
import { checkLink } from '@/lib/analyze';

export async function POST(req: Request) {
  const { url } = await req.json().catch(() => ({ url: '' }));
  let host = '';
  try { host = new URL(url).hostname.replace(/^www\./, ''); } catch { return NextResponse.json({ ok: false, host: '' }); }
  const ok = await checkLink(url);
  const source = /vimeo/.test(host) ? 'Vimeo' : /youtu/.test(host) ? 'YouTube' : /drive\.google/.test(host) ? 'Google Drive' : /dropbox/.test(host) ? 'Dropbox' : host;
  return NextResponse.json({ ok, host, source });
}
