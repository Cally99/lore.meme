// @ts-nocheck
// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Define protected routes and their required roles
const protectedRoutes = [
  {
    path: '/writer',
    roles: ['WRITER'], // Use string instead of enum
  }
];

export async function middleware(request: NextRequest) {
  // Get token
  const token = await getToken({
    req: request as any,
    secret: process.env.NEXTAUTH_SECRET
  });

  // Check if the path is a protected route
  const isProtectedRoute = protectedRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route.path)
  );
  
  // Allow access to auth-related routes without a token
  if (['/login', '/signup', '/api/auth'].some(path => 
    request.nextUrl.pathname.startsWith(path)
  )) {
    // If user is already logged in, redirect to home page
    if (token && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    
    return NextResponse.next();
  }

  // If it's a protected route but no token exists, redirect to login
  if (isProtectedRoute && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', request.url);
    
    return NextResponse.redirect(loginUrl);
  }

  // If there is a token, check role-based access for protected routes
  if (token && isProtectedRoute) {
    const userRole = token.role as string;
    
    // Find the protected route that matches the current path
    const matchedRoute = protectedRoutes.find(route => 
      request.nextUrl.pathname.startsWith(route.path)
    );
    
    // If role is not allowed for this route, redirect to home
    if (matchedRoute && !matchedRoute.roles.includes(userRole)) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public|images).*)',
  ],
};
