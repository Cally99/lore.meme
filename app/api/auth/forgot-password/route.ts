// src/app/api/auth/forgot-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authLogger } from '@/lib/monitoring/logger';
import { sendCustomPasswordResetEmail } from '@/lib/email/directus-email-service';

export async function POST(req: NextRequest) {
  const requestId = Math.random().toString(36).substr(2, 9);
  
  try {
    const { email } = await req.json();
    
    if (!email) {
      console.log(`❌ [${requestId}] Password reset request missing email`);
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    console.log(`🔍 [${requestId}] Initiating password reset for:`, email.toLowerCase());
    console.log(`🔍 [${requestId}] Reset URL will be:`, `${process.env.NEXTAUTH_URL}/auth/reset-password`);
    console.log(`🔍 [${requestId}] Using Directus URL:`, process.env.NEXT_PUBLIC_DIRECTUS_URL);
    
    // Use our custom frontend email service with Directus SDK
    const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password`;
    const result = await sendCustomPasswordResetEmail(email.toLowerCase(), resetUrl);

    if (!result.success) {
      console.log(`❌ [${requestId}] Password reset email failed:`, result.error);
      
      // For security, we still return success to prevent email enumeration
      // The actual error is logged but not exposed to the client
      authLogger.warn('Password reset failed but returning success for security', {
        requestId,
        email: email.toLowerCase(),
        error: result.error,
        directusUrl: process.env.NEXT_PUBLIC_DIRECTUS_URL,
        timestamp: new Date().toISOString(),
      });
    } else {
      console.log(`✅ [${requestId}] Password reset email sent successfully`);
      
      authLogger.info('Password reset email sent via frontend service', {
        requestId,
        email: email.toLowerCase(),
        resetUrl,
        timestamp: new Date().toISOString(),
      });
    }

    // Always return success to prevent email enumeration attacks
    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    });

  } catch (error) {
    console.log(`❌ [${requestId}] Password reset error:`, error);
    authLogger.error('Password reset failed', error as Error, {
      requestId,
      email: req.body?.email || 'unknown',
      timestamp: new Date().toISOString(),
    });
    
    // Even on error, return success message to prevent email enumeration
    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  }
}