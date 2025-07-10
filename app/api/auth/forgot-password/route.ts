// src/app/api/auth/forgot-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authLogger } from '@/lib/monitoring/logger';
import { sendCustomPasswordResetEmail } from '@/lib/email/directus-email-service';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    console.log('🔍 Initiating frontend-managed password reset for:', email.toLowerCase());
    
    // Use our custom frontend email service with Directus SDK
    const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password`;
    const result = await sendCustomPasswordResetEmail(email.toLowerCase(), resetUrl);

    if (!result.success) {
      console.log('❌ Custom password reset failed:', result.error);
      
      // For security, we still return success to prevent email enumeration
      // The actual error is logged but not exposed to the client
      authLogger.warn('Password reset failed but returning success for security', {
        email: email.toLowerCase(),
        error: result.error
      });
    } else {
      console.log('✅ Password reset email sent successfully via frontend service');
      
      authLogger.info('Password reset email sent via frontend service', {
        email: email.toLowerCase(),
        timestamp: new Date().toISOString(),
      });
    }

    // Always return success to prevent email enumeration attacks
    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    });

  } catch (error) {
    console.log('❌ Password reset error:', error);
    authLogger.error('Password reset failed', error as Error);
    
    // Even on error, return success message to prevent email enumeration
    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  }
}