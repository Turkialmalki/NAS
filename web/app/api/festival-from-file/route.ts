import { NextResponse } from 'next/server';
import { sessionUser } from '@/lib/ctx';
import { extractFestival } from '@/lib/festivalExtract';

export const maxDuration = 60;

export async function POST(req: Request) {
  if (!(await sessionUser())) return NextResponse.json({ error: 'auth' }, { status: 401 });
  const b = await req.json().catch(() => null) as { name?: string; kind?: string; text?: string; file?: { media_type: string; data: string } } | null;
  if (!b || (!b.text?.trim() && !b.file?.data)) return NextResponse.json({ error: 'empty' }, { status: 400 });
  const file = b.file && /^(application\/pdf|image\/(png|jpeg|webp|gif))$/.test(b.file.media_type) && b.file.data.length < 4_400_000 ? b.file : undefined;
  const draft = await extractFestival({ name: String(b.name || 'وثيقة').slice(0, 120), kind: String(b.kind || 'text'), text: String(b.text || '').slice(0, 120_000), file });
  return NextResponse.json({ draft });
}
