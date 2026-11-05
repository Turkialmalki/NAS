import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function POST(request: Request) {
  // build the redirect first and write the cleared cookies straight onto it, so nothing can re-add them
  const res = NextResponse.redirect(new URL('/login', request.url), { status: 303 });
  res.headers.set('Cache-Control', 'no-store');
  const store = await cookies();
  const sb = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => list.forEach(({ name, value, options }) => res.cookies.set(name, value, options)),
    },
  });
  await sb.auth.signOut({ scope: 'local' }).catch(() => {});
  // belt and braces: expire every Supabase auth cookie
  for (const c of store.getAll()) if (c.name.startsWith('sb-')) res.cookies.set(c.name, '', { path: '/', maxAge: 0 });
  return res;
}
