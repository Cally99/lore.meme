// src/app/api/auth/forgot-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authLogger } from '@/lib/monitoring/logger';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    console.log('🔍 Initiating password reset for:', email.toLowerCase());
    
    // Use Directus password reset functionality
    const resetResponse = await fetch(
      `${process.env.NEXT_PUBLIC_DIRECTUS_URL}/auth/password/request`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.toLowerCase(),
          reset_url: `${process.env.NEXTAUTH_URL}/auth/reset-password`, // URL where user will reset password
        }),
      }
    );

    if (!resetResponse.ok) {
      const errorData = await resetResponse.json().catch(() => ({}));
      console.log('❌ Directus password reset failed:', resetResponse.status, errorData);
      
      // Don't reveal if email exists or not for security
      if (resetResponse.status === 404) {
        // Still return success to prevent email enumeration
        authLogger.info('Password reset requested for non-existent email', { email: email.toLowerCase() });
        return NextResponse.json({
          success: true,
          message: 'If an account with that email exists, a password reset link has been sent.',
        });
      }
      
      throw new Error('Password reset request failed');
    }

    console.log('✅ Password reset email sent successfully via Directus');
    
    authLogger.info('Password reset email sent', {
      email: email.toLowerCase(),
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    });

  } catch (error) {
    console.log('❌ Password reset error:', error);
    authLogger.error('Password reset failed', error as Error);
    
    return NextResponse.json(
      { error: 'Failed to process password reset request' },
      { status: 500 }
    );
  }
}