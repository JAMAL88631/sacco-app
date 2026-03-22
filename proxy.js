import { NextResponse } from 'next/server';

function redirectTo(request, pathname) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = '';
  return NextResponse.redirect(url);
}

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const authCookie = request.cookies.get('sacco-auth')?.value;
  const role = request.cookies.get('sacco-role')?.value;

  const isAdminRoute = pathname.startsWith('/admin');
  const isMemberRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/memberDashboard');

  if (!isAdminRoute && !isMemberRoute) {
    return NextResponse.next();
  }

  if (!authCookie) {
    return redirectTo(request, '/auth');
  }

  if (isAdminRoute && role !== 'admin') {
    return redirectTo(request, role === 'member' ? '/dashboard' : '/auth');
  }

  if (isMemberRoute && role === 'admin') {
    return redirectTo(request, '/admin');
  }

  if (isMemberRoute && role !== 'member') {
    return redirectTo(request, '/auth');
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/memberDashboard/:path*'],
};
