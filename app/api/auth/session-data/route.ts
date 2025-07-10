// app/api/auth/session-data/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authSessionManager } from '@/lib/auth/session-manager';
import { authLogger } from '@/lib/monitoring/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    const session = authSessionManager.getSession(sessionId);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Return session data for auto-login
    return NextResponse.json({
      success: true,
      email: session.email,
      status: session.status,
      userId: session.metadata.userId,
      token: session.lastEvent?.data?.token || null
    });

  } catch (error) {
    authLogger.error('Session data fetch failed', error as Error);
    return NextResponse.json(
      { error: 'Failed to fetch session data' },
      { status: 500 }
    );
  }
}