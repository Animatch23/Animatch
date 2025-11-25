import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // redirect root path to login
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // todo in future sprints: add authentication checks here, e.g.
  // const token = request.cookies.get('session-token');
  // const role = getUserRole(token);
  
  // protect admin routes (when implemented), e.g. smthn like
  // if (pathname.startsWith('/admin') && role !== 'admin') {
  //   return NextResponse.redirect(new URL('/login', request.url));
  // }
}

export const config = {
  matcher: [
    '/',
    // more paths can be added here as needed
  ],
};
