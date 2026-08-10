import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Basic in-memory IP rate limiter for single-node / edge isolation.
// For robust serverless (Vercel) rate limiting, use Upstash Redis + @upstash/ratelimit.
const requestCache = new Map<string, { count: number; windowStart: number }>();

const RATE_LIMITS = {
  login: { maxRequests: 5, windowMs: 60 * 1000 }, // 5 req/min
  api: { maxRequests: 100, windowMs: 60 * 1000 }, // 100 req/min
};

export function proxy(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1';
  const path = request.nextUrl.pathname;
  
  // Choose limit profile based on path
  let limitConfig = RATE_LIMITS.api;
  if (path.startsWith('/api/auth/callback') || path.startsWith('/api/auth/signin')) {
    limitConfig = RATE_LIMITS.login;
  }
  
  const cacheKey = `${ip}:${path.startsWith('/api/auth') ? 'login' : 'api'}`;
  const now = Date.now();
  
  let record = requestCache.get(cacheKey);
  
  if (!record || now - record.windowStart > limitConfig.windowMs) {
    record = { count: 1, windowStart: now };
    requestCache.set(cacheKey, record);
  } else {
    record.count++;
    requestCache.set(cacheKey, record);
    
    if (record.count > limitConfig.maxRequests) {
      return new NextResponse('Too Many Requests. Please slow down.', { 
        status: 429,
        headers: {
          'Retry-After': Math.ceil((record.windowStart + limitConfig.windowMs - now) / 1000).toString(),
        }
      });
    }
  }

  // Periodic memory cleanup (probabilistic)
  if (Math.random() < 0.05) {
    const expiredCutoff = now - (60 * 1000 * 5); // 5 mins ago
    for (const [key, value] of requestCache.entries()) {
      if (value.windowStart < expiredCutoff) {
        requestCache.delete(key);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  // Apply to API routes. Server Actions are harder to match cleanly in Next.js via path, 
  // but this perfectly protects the critical /api/auth endpoints.
  matcher: ['/api/:path*'],
};
