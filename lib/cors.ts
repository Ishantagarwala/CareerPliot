import { NextResponse } from 'next/server';

/**
 * CORS for the mobile API surface.
 *
 * WHY THIS IS NOT IN next.config.ts
 *
 * `Access-Control-Allow-Origin` accepts exactly ONE origin (or `*`) — a
 * comma-separated list is invalid and browsers reject it. Static headers cannot
 * echo the caller's origin, so the header has to be set per-request here.
 *
 * `*` is deliberately not used: these endpoints are authenticated, and a
 * wildcard lets any web page drive a request from a signed-in user's browser.
 *
 * Native fetch ignores CORS entirely, so this exists for a web/PWA client and
 * for the preflight that an `Authorization` header triggers on some Android
 * HTTP stacks — not because the Expo app needs it.
 */

function allowedOrigins(): string[] {
  const origins = ['https://careerpilot.cc', 'https://www.careerpilot.cc'];
  if (process.env.NODE_ENV !== 'production') {
    // Expo dev server + a local web build.
    origins.push('http://localhost:8081', 'http://127.0.0.1:8081');
    origins.push('http://localhost:3000', 'http://127.0.0.1:3000');
  }
  return origins;
}

/** Headers to attach to a response, echoing Origin only when it is allowed. */
export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin');
  const headers: Record<string, string> = {
    // Origin changes the response, so shared caches must key on it.
    Vary: 'Origin',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '600',
  };

  if (origin && allowedOrigins().includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return headers;
}

/** JSON response with CORS applied. Use for every /api/auth/mobile/* reply. */
export function corsJson(
  req: Request,
  body: unknown,
  init?: { status?: number; headers?: Record<string, string> },
): NextResponse {
  return NextResponse.json(body, {
    status: init?.status ?? 200,
    headers: { ...corsHeaders(req), ...init?.headers },
  });
}

/** Preflight. Returns 204 with the CORS headers and no body. */
export function corsPreflight(req: Request): NextResponse {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}
