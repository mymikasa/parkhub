import { jwtVerify } from 'jose';
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
// JWT verification with jose (Edge Runtime compatible)
// ──────────────────────────────────────────────

interface JwtPayload {
  sub?: string;
  role?: UserRole;
  exp?: number;
}

// Token cache for performance optimization
// Caches verified JWT payloads for 5 minutes to avoid repeated verification
// Uses LRU (Least Recently Used) eviction when cache is full
const tokenCache = new Map<string, { payload: JwtPayload; expiry: number; lastAccess: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 1000; // Maximum number of tokens to cache

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

// Evict least recently used entries when cache is full
function evictLRU(): void {
  if (tokenCache.size < MAX_CACHE_SIZE) return;

  let oldestKey: string | null = null;
  let oldestAccess = Infinity;

  for (const [key, value] of tokenCache.entries()) {
    if (value.lastAccess < oldestAccess) {
      oldestAccess = value.lastAccess;
      oldestKey = key;
    }
  }

  if (oldestKey) {
    tokenCache.delete(oldestKey);
  }
}

// Lazily initialize the secret key (recreated per cold start)
let secretKey: Uint8Array | null = null;

function getSecretKey(): Uint8Array {
  if (!secretKey) {
    secretKey = new TextEncoder().encode(process.env.JWT_SECRET);
  }
  return secretKey;
}

async function verifyJwtToken(token: string): Promise<JwtPayload | null> {
  // Check cache first — skip crypto verification for recently verified tokens
  const cached = tokenCache.get(token);
  if (cached && cached.expiry > Date.now()) {
    cached.lastAccess = Date.now();
    return cached.payload;
  }

  try {
    const { payload } = await jwtVerify(token, getSecretKey());

    const result: JwtPayload = {
      sub: payload.sub as string | undefined,
      role: payload.role as UserRole | undefined,
      exp: payload.exp,
    };

    // Evict LRU if cache is full
    evictLRU();

    // Cache the verified result
    tokenCache.set(token, {
      payload: result,
      expiry: Date.now() + CACHE_TTL_MS,
      lastAccess: Date.now(),
    });

    return result;
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────
// Middleware
// ──────────────────────────────────────────────

export async function middleware(request: NextRequest) {
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

  // Verify JWT signature and parse payload
  const payload = await verifyJwtToken(accessToken);

  // Invalid signature, expired, or malformed token → redirect to login
  if (!payload) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    const response = NextResponse.redirect(loginUrl);
    // Clear the stale/invalid cookie
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
