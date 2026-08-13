import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Basic in-memory IP rate limiter for single-node / edge isolation.
// For serverless deployments (e.g. Vercel), pair with Upstash Redis + @upstash/ratelimit.
const requestCache = new Map<string, { count: number; windowStart: number }>();

const RATE_LIMITS = {
  login: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 requests per minute
  api: { maxRequests: 120, windowMs: 60 * 1000 },  // 120 requests per minute
};

export function middleware(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1';
  const path = request.nextUrl.pathname;
  
  // Choose limit profile based on path
  let limitConfig = RATE_LIMITS.api;
  if (path.startsWith('/api/auth/callback') || path.startsWith('/api/auth/signin') || path === '/login') {
    limitConfig = RATE_LIMITS.login;
  }
  
  const cacheKey = `${ip}:${path.startsWith('/api/auth') || path === '/login' ? 'login' : 'api'}`;
  const now = Date.now();
  
  let record = requestCache.get(cacheKey);
  
  if (!record || now - record.windowStart > limitConfig.windowMs) {
    record = { count: 1, windowStart: now };
    requestCache.set(cacheKey, record);
  } else {
    record.count++;
    requestCache.set(cacheKey, record);
    
    if (record.count > limitConfig.maxRequests) {
      return new NextResponse('Too Many Requests. Rate limit exceeded, please try again shortly.', { 
        status: 429,
        headers: {
          'Retry-After': Math.ceil((record.windowStart + limitConfig.windowMs - now) / 1000).toString(),
          'Content-Type': 'text/plain',
        }
      });
    }
  }

  // Probabilistic memory cleanup for expired cache records
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
  matcher: ['/api/:path*', '/login'],
};
