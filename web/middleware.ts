import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  // getClaims verifies the session locally (no network round-trip when keys are asymmetric) and refreshes it when needed
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims?.sub ? data.claims : null;
  const p = request.nextUrl.pathname;
  if (!user && (p.startsWith('/app') || p.startsWith('/review'))) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    // keep deep links into the dashboard; everything else lands on the dashboard home
    if (p.startsWith('/app/')) url.searchParams.set('next', p + request.nextUrl.search);
    return NextResponse.redirect(url);
  }
  // already signed in: no need to log in again
  if (user && p === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/app'; url.search = '';
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = { matcher: ['/app/:path*', '/review/:path*', '/login', '/auth/:path*'] };
