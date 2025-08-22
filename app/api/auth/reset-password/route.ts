// src/app/api/auth/reset-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authLogger } from '@/lib/monitoring/logger';

export async function POST(req: NextRequest) {
  const requestId = Math.random().toString(36).substr(2, 9);
  
  try {
    const { token, password } = await req.json();
    
    if (!token || !password) {
      console.log(`❌ [${requestId}] Password reset completion missing required fields:`, { hasToken: !!token, hasPassword: !!password });
      return NextResponse.json({ error: 'Token and password are required' }, { status: 400 });
    }

    if (password.length < 8) {
      console.log(`❌ [${requestId}] Password reset completion failed: password too short`);
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    console.log(`🔍 [${requestId}] Processing password reset completion with token`);
    console.log(`🔍 [${requestId}] Using Directus URL:`, process.env.NEXT_PUBLIC_DIRECTUS_URL);
    console.log(`🔍 [${requestId}] Token length:`, token.length);
    
    // Use Directus password reset completion functionality
    const directusUrl = `${process.env.NEXT_PUBLIC_DIRECTUS_URL}/auth/password/reset`;
    console.log(`🔍 [${requestId}] Making request to:`, directusUrl);
    
    const resetResponse = await fetch(directusUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        password,
      }),
    });

    console.log(`🔍 [${requestId}] Directus response status:`, resetResponse.status);

    if (!resetResponse.ok) {
      const errorData = await resetResponse.json().catch(() => ({}));
      console.log(`❌ [${requestId}] Directus password reset completion failed:`, resetResponse.status, errorData);
      
      authLogger.error('Password reset completion failed at Directus', new Error(`Status ${resetResponse.status}`), {
        requestId,
        status: resetResponse.status,
        errorData,
        directusUrl,
        timestamp: new Date().toISOString(),
      });
      
      if (resetResponse.status === 401 || resetResponse.status === 403) {
        return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 });
      }
      
      throw new Error('Password reset completion failed');
    }

    const resetData = await resetResponse.json();
    console.log(`✅ [${requestId}] Password reset completed successfully via Directus`);
    console.log(`🔍 [${requestId}] Reset data:`, { userId: resetData.user?.id, userEmail: resetData.user?.email });
    
    authLogger.info('Password reset completed', {
      requestId,
      userId: resetData.user?.id || 'unknown',
      userEmail: resetData.user?.email || 'unknown',
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Password has been successfully reset.',
    });

  } catch (error) {
    console.log(`❌ [${requestId}] Password reset completion error:`, error);
    authLogger.error('Password reset completion failed', error as Error, {
      requestId,
      timestamp: new Date().toISOString(),
    });
    
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    );
  }
}