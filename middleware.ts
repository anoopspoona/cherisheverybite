import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  if (!request.nextUrl.pathname.startsWith('/admin')) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        }
      }
    }
  );

  const { data: userResult } = await supabase.auth.getUser();
  const user = userResult.user;

  if (!user?.email) {
    const loginUrl = new URL('/account/login', request.url);
    loginUrl.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('role,is_active')
    .ilike('email', user.email)
    .eq('is_active', true)
    .maybeSingle();

  if (!adminUser) {
    return NextResponse.redirect(new URL('/account', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*']
};
