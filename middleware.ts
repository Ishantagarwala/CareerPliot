import { edgeAuth as auth } from "@/lib/auth.config";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { nextUrl } = req;

  // Paths requiring authentication
  const protectedRoutes = [
    '/dashboard',
    '/career',
    '/roadmap',
    '/courses',
    '/ai-hub',
    '/resume',
    '/news',
    '/profile',
    '/jobs',
    '/projects',
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
    '/ai-hub/:path*',
    '/resume/:path*',
    '/news/:path*',
    '/profile/:path*',
    '/jobs/:path*',
    '/projects/:path*',
  ],
};
