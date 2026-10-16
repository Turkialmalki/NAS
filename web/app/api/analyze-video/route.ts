import { NextResponse } from 'next/server';
import { supabaseAnon } from '@/lib/supabase/server';
import { analyzeVideo, signReport, type VideoInput } from '@/lib/videoAnalysis';
import type { Category } from '@/lib/analyze';

export const maxDuration = 60;

export async function POST(req: Request) {
  const b = await req.json().catch(() => null) as (VideoInput & { festival_id?: string }) | null;
  if (!b || !Array.isArray(b.frames) || !b.stats || !b.frames.length || b.frames.length > 12) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  const frames = b.frames.filter((f) => typeof f.image === 'string' && f.image.startsWith('data:image/jpeg') && f.image.length < 400_000)
    .map((f) => ({ t: Number(f.t) || 0, image: f.image, thumb: typeof f.thumb === 'string' && f.thumb.length < 120_000 ? f.thumb : '' }));
  let cats: Category[] = [];
  if (b.festival_id) {
    const { data } = await supabaseAnon().from('categories').select('id,name,description').eq('festival_id', b.festival_id).order('sort');
    cats = (data || []) as Category[];
  }
  const s = b.stats;
  const stats = {
    duration: Number(s.duration) || 0, width: Number(s.width) || 0, height: Number(s.height) || 1, size: s.size != null ? Number(s.size) : null,
    brightness: Number(s.brightness) || 0, saturation: Number(s.saturation) || 0, warmth: Number(s.warmth) || 0, contrast: Number(s.contrast) || 0,
    variety: Number(s.variety) || 0, palette: Array.isArray(s.palette) ? s.palette.filter((x) => /^#[0-9a-f]{6}$/i.test(x)).slice(0, 6) : [],
    fadeIn: !!s.fadeIn, fadeOut: !!s.fadeOut, darkShare: Number(s.darkShare) || 0,
  };
  const report = await analyzeVideo({ frames, stats, title: b.title?.slice(0, 200), synopsis: b.synopsis?.slice(0, 2000), genre: b.genre?.slice(0, 40), category_id: b.category_id || null }, cats);
  return NextResponse.json({ report, sig: signReport(report) });
}
