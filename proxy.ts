import { auth } from "@/lib/auth";

export const proxy = auth((req) => {
  const isLoggedIn = !!req.auth;
  const { nextUrl } = req;

  // Paths requiring authentication
  const protectedRoutes = [
    '/dashboard',
    '/career',
    '/roadmap',
    '/courses',
    '/pdf',
    '/tutor',
    '/ai-hub',
    '/resume',
    '/study',
    '/news',
    '/profile'
  ];

  const isProtectedRoute = protectedRoutes.some((route) =>
    nextUrl.pathname.startsWith(route)
  );

  if (isProtectedRoute && !isLoggedIn) {
    // Redirect to login if user is not authenticated
    return Response.redirect(new URL('/login', nextUrl));
  }
});

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/career/:path*',
    '/roadmap/:path*',
    '/courses/:path*',
    '/pdf/:path*',
    '/tutor/:path*',
    '/ai-hub/:path*',
    '/resume/:path*',
    '/study/:path*',
    '/news/:path*',
    '/profile/:path*',
  ],
};
