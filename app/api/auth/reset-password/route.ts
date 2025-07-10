// src/app/api/auth/reset-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authLogger } from '@/lib/monitoring/logger';

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();
    
    if (!token || !password) {
      return NextResponse.json({ error: 'Token and password are required' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    console.log('🔍 Processing password reset with token');
    
    // Use Directus password reset completion functionality
    const resetResponse = await fetch(
      `${process.env.NEXT_PUBLIC_DIRECTUS_URL}/auth/password/reset`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password,
        }),
      }
    );

    if (!resetResponse.ok) {
      const errorData = await resetResponse.json().catch(() => ({}));
      console.log('❌ Directus password reset completion failed:', resetResponse.status, errorData);
      
      if (resetResponse.status === 401 || resetResponse.status === 403) {
        return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 });
      }
      
      throw new Error('Password reset completion failed');
    }

    const resetData = await resetResponse.json();
    console.log('✅ Password reset completed successfully via Directus');
    
    authLogger.info('Password reset completed', {
      userId: resetData.user?.id || 'unknown',
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Password has been successfully reset.',
    });

  } catch (error) {
    console.log('❌ Password reset completion error:', error);
    authLogger.error('Password reset completion failed', error as Error);
    
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    );
  }
}