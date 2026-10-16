import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') || '/app';
  if (code) {
    const sb = await supabaseServer();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL('/login?error=link', url.origin));
  }
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  if (tokenHash && type) {
    const sb = await supabaseServer();
    const { error } = await sb.auth.verifyOtp({ token_hash: tokenHash, type: type as 'email' | 'magiclink' | 'signup' });
    if (error) return NextResponse.redirect(new URL('/login?error=link', url.origin));
  }
  return NextResponse.redirect(new URL(next.startsWith('/') ? next : '/app', url.origin));
}
