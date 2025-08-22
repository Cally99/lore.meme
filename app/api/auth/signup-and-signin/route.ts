import { NextRequest, NextResponse } from 'next/server';
import { authLogger } from '@/lib/auth/logger';

/**
 * @deprecated This route has been deprecated in favor of NextAuth credentials provider.
 * Signup flow is now handled through NextAuth signIn('credentials', { isSignup: 'true' }).
 * This route is kept for backward compatibility and will return a deprecation notice.
 */
export async function POST(req: NextRequest) {
  console.log('⚠️ [DEPRECATED] /api/auth/signup-and-signin called - this route is deprecated');
  authLogger.warn('Deprecated signup-and-signin route called', {
    userAgent: req.headers.get('user-agent'),
    ip: req.ip
  });

  return NextResponse.json(
    {
      error: 'DEPRECATED_ENDPOINT',
      message: 'This endpoint has been deprecated. Please use NextAuth signIn() with isSignup flag instead.',
      migration: {
        old: 'POST /api/auth/signup-and-signin',
        new: 'signIn("credentials", { email, password, isSignup: "true", username })'
      }
    },
    { status: 410 } // 410 Gone
  );
}

// Also handle GET requests to provide information about the deprecation
export async function GET(req: NextRequest) {
  console.log('⚠️ [DEPRECATED] GET /api/auth/signup-and-signin called - this route is deprecated');
  
  return NextResponse.json(
    {
      deprecated: true,
      message: 'This endpoint has been deprecated and moved to NextAuth credentials provider.',
      migration: {
        old: 'POST /api/auth/signup-and-signin',
        new: 'signIn("credentials", { email, password, isSignup: "true", username })',
        docs: 'https://next-auth.js.org/getting-started/client#signin'
      },
      alternatives: [
        'Use NextAuth signIn() for all authentication flows',
        'Session management is now handled automatically by NextAuth'
      ]
    },
    {
      status: 410,
      headers: {
        'X-Deprecated': 'true',
        'X-Replacement': 'NextAuth credentials provider'
      }
    }
  );
}