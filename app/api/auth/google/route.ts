// Google OAuth route - redirects to NextAuth
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Redirect to NextAuth Google provider
  const baseUrl = request.nextUrl.origin;
  return NextResponse.redirect(`${baseUrl}/api/auth/signin/google`);
}

export async function POST(request: NextRequest) {
  // Redirect to NextAuth Google provider
  const baseUrl = request.nextUrl.origin;
  return NextResponse.redirect(`${baseUrl}/api/auth/signin/google`);
}