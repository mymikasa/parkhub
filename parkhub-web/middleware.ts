import { NextRequest, NextResponse } from 'next/server';
import type { UserRole } from './lib/auth/types';

// ──────────────────────────────────────────────
// Route permission table
// ──────────────────────────────────────────────

type RoutePermission = {
  roles: UserRole[];
};

const ROUTE_PERMISSIONS: Record<string, RoutePermission> = {
  '/tenant-management': { roles: ['platform_admin'] },
  '/parking-lot': { roles: ['platform_admin', 'tenant_admin'] },
  '/device-management': { roles: ['platform_admin', 'tenant_admin', 'operator'] },
  '/billing-rules': { roles: ['platform_admin', 'tenant_admin'] },
  '/realtime-monitor': { roles: ['platform_admin', 'tenant_admin', 'operator'] },
  '/entry-exit-records': { roles: ['platform_admin', 'tenant_admin', 'operator'] },
  '/operator-workspace': { roles: ['tenant_admin', 'operator'] },
};

// Routes that are publicly accessible (no auth required)
const PUBLIC_ROUTES = ['/login', '/payment'];

// ──────────────────────────────────────────────
// JWT decode helpers (no crypto – just parse payload)
// ──────────────────────────────────────────────

interface JwtPayload {
  sub?: string;
  role?: UserRole;
  exp?: number;
}

// Token cache for performance optimization
// Caches parsed JWT payloads for 5 minutes to avoid repeated parsing
const tokenCache = new Map<string, { payload: JwtPayload; expiry: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Clean up expired cache entries every 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of tokenCache.entries()) {
      if (value.expiry < now) {
        tokenCache.delete(key);
      }
    }
  }, 10 * 60 * 1000);
}

function parseJwtPayload(token: string): JwtPayload | null {
  // Check cache first
  const cached = tokenCache.get(token);
  if (cached && cached.expiry > Date.now()) {
    return cached.payload;
  }

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    // base64url decode
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    const result = JSON.parse(json) as JwtPayload;
    
    // Cache the result
    tokenCache.set(token, {
      payload: result,
      expiry: Date.now() + CACHE_TTL_MS
    });
    
    return result;
  } catch {
    return null;
  }
}

function isTokenExpired(payload: JwtPayload): boolean {
  if (!payload.exp) return true;
  return Date.now() / 1000 >= payload.exp;
}

// ──────────────────────────────────────────────
// Middleware
// ──────────────────────────────────────────────

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  // Allow Next.js internals and static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Get access token from cookie
  const accessToken = request.cookies.get('access_token')?.value;

  // No token → redirect to login
  if (!accessToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Parse JWT payload
  const payload = parseJwtPayload(accessToken);

  // Invalid or expired token → redirect to login
  if (!payload || isTokenExpired(payload)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    const response = NextResponse.redirect(loginUrl);
    // Clear the stale cookie
    response.cookies.delete('access_token');
    return response;
  }

  const userRole = payload.role;

  // Check route-level permissions
  const matchedRoute = Object.keys(ROUTE_PERMISSIONS).find((route) =>
    pathname.startsWith(route)
  );

  if (matchedRoute && userRole) {
    const { roles } = ROUTE_PERMISSIONS[matchedRoute];
    if (!roles.includes(userRole)) {
      // No permission → redirect to 403
      return NextResponse.redirect(new URL('/403', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
