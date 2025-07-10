// src/app/api/auth/signup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authLogger } from '@/lib/monitoring/logger';
import { authSessionManager } from '@/lib/auth/session-manager';

export async function POST(req: NextRequest) {
  try {
    const { email, first_name, password, sessionId } = await req.json();
    
    if (!email || !first_name || !password) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Use admin token from environment
    const adminToken = process.env.ADMIN_TOKEN;
    if (!adminToken) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Get client IP and user agent
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    
    // Create or get session for tracking
    let session;
    if (sessionId) {
      session = authSessionManager.getSession(sessionId);
    }
    
    if (!session) {
      session = authSessionManager.createSession(email.toLowerCase(), {
        provider: 'credentials',
        ip: ipAddress,
        userAgent
      });
    }
    
    // Update session status to creating user
    authSessionManager.updateSessionStatus(session.id, 'pending-creation');
    
    // Check if IP is blocked using REST API
    try {
      const blockedIpsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_DIRECTUS_URL}/items/blocked_ips?filter[ip][_eq]=${encodeURIComponent(ipAddress)}&filter[_or][0][expires][_gt]=${encodeURIComponent(new Date().toISOString())}&filter[_or][1][expires][_null]=true&limit=1`,
        {
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (blockedIpsResponse.ok) {
        const blockedIpsData = await blockedIpsResponse.json();
        if (blockedIpsData.data && blockedIpsData.data.length > 0) {
          authLogger.warn('Signup attempt from blocked IP', { ipAddress });
          return NextResponse.json({ error: 'This IP address has been blocked' }, { status: 403 });
        }
      }
    } catch (error) {
      // If blocked_ips collection doesn't exist or no permissions, continue without IP check
      authLogger.warn('Could not check blocked IPs, continuing with signup', { ipAddress });
    }
    
    // Check if user already exists by email using REST API
    console.log('🔍 Checking if user exists:', email.toLowerCase());
    const emailCheckUrl = `${process.env.NEXT_PUBLIC_DIRECTUS_URL}/users?filter[email][_eq]=${encodeURIComponent(email.toLowerCase())}&limit=1`;
    console.log('🔍 Email check URL:', emailCheckUrl);
    
    const emailCheckResponse = await fetch(emailCheckUrl, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log('🔍 Email check response status:', emailCheckResponse.status);
    
    if (emailCheckResponse.ok) {
      const emailCheckData = await emailCheckResponse.json();
      console.log('🔍 Email check data:', JSON.stringify(emailCheckData, null, 2));
      
      if (emailCheckData.data && emailCheckData.data.length > 0) {
        console.log('❌ User already exists with email:', email.toLowerCase());
        return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
      }
      console.log('✅ No existing user found, proceeding with signup');
    } else {
      const errorText = await emailCheckResponse.text();
      console.log('❌ Email check failed:', emailCheckResponse.status, errorText);
      // Continue with signup attempt even if email check fails
    }

    // All new users get CREATOR role
    const creatorRoleId = process.env.NEXT_PUBLIC_ROLE_LORE_CREATOR_ID;
    
    // Create new user in Directus using REST API
    const createUserResponse = await fetch(
      `${process.env.NEXT_PUBLIC_DIRECTUS_URL}/users`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.toLowerCase(),
          first_name: first_name, // Use first_name as display name
          external_identifier: `email:${email.toLowerCase()}`,
          provider: 'credentials',
          role: creatorRoleId, // Always assign CREATOR role
          status: 'active',
          password: password, // Let Directus handle password hashing
          // Ensure user can login immediately
          email_notifications: true,
          appearance: null,
          theme_dark: null,
          theme_light: null,
          theme_light_overrides: null,
          theme_dark_overrides: null
        }),
      }
    );

    if (!createUserResponse.ok) {
      const errorData = await createUserResponse.json();
      authLogger.error('Failed to create user in Directus', new Error(`HTTP ${createUserResponse.status}: ${JSON.stringify(errorData)}`));
      return NextResponse.json({ error: 'Failed to create user account' }, { status: 500 });
    }

    const newUser = await createUserResponse.json();
    
    // Update session with user creation success
    authSessionManager.setSessionUserId(session.id, newUser.data.id);
    authSessionManager.updateSessionStatus(session.id, 'ready-for-login', {
      type: 'user-created',
      data: {
        userId: newUser.data.id,
        email: email.toLowerCase(),
        role: 'CREATOR'
      }
    });
    
    authLogger.info('Created new CREATOR user via email signup', {
      userId: newUser.data.id,
      email: email.toLowerCase(),
      role: 'CREATOR',
      sessionId: session.id
    });

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      user: {
        id: newUser.data.id,
        email: email.toLowerCase(),
        username: first_name.toLowerCase(),
        role: 'CREATOR',
      },
    });

  } catch (error) {
    authLogger.error('Signup error', error as Error);
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Signup failed' },
      { status: 500 }
    );
  }
}
