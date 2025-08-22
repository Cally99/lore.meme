// app/api/auth/check-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authLogger } from '@/lib/monitoring/logger';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');
  
  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_DIRECTUS_URL}/users?filter[email][_eq]=${encodeURIComponent(email.toLowerCase())}&fields=id,email`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.ADMIN_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({ 
        exists: data.data && data.data.length > 0,
        message: data.data && data.data.length > 0 
          ? 'An account with this email already exists. Please login.' 
          : null
      });
    }
    
    // If Directus API fails, assume email doesn't exist to prevent blocking signup
    authLogger.warn('Failed to check email existence', { email });
    return NextResponse.json({ exists: false });
  } catch (error) {
    authLogger.error('Error checking email existence', error as Error);
    return NextResponse.json({ exists: false });
  }
}