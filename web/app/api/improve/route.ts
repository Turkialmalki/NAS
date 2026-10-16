import { NextResponse } from 'next/server';
import { improveSynopsis } from '@/lib/analyze';

export async function POST(req: Request) {
  const { text } = await req.json().catch(() => ({ text: '' }));
  if (!text || String(text).length > 2000) return NextResponse.json({ text: text || '' });
  return NextResponse.json({ text: await improveSynopsis(String(text)) });
}
