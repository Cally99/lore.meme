// app/api/webhooks/directus/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { UserCreatedWebhook, UserVerifiedWebhook } from '@/types/auth/webhooks';
import { authLogger } from '@/lib/monitoring/logger';

// Simple in-memory cache for user creation events
declare global {
  var userCreationCache: Map<string, { userId: string; email: string; timestamp: number }> | undefined;
}

if (!global.userCreationCache) {
  global.userCreationCache = new Map();
  
  // Clean up old entries every 10 minutes
  setInterval(() => {
    const now = Date.now();
    const tenMinutes = 10 * 60 * 1000;
    
    if (global.userCreationCache) {
      for (const [email, data] of global.userCreationCache.entries()) {
        if (now - data.timestamp > tenMinutes) {
          global.userCreationCache.delete(email);
        }
      }
    }
  }, 10 * 60 * 1000);
}

const userCache = global.userCreationCache;

export async function POST(request: NextRequest) {
  try {
    const webhook = await request.json();
    
    console.log('🔍 [DIRECTUS WEBHOOK] Received:', {
      event: webhook.event,
      collection: webhook.collection,
      payloadId: webhook.payload?.id
    });

    // Handle user creation events
    if (webhook.event === 'users.create' && webhook.collection === 'directus_users') {
      const userWebhook = webhook as UserCreatedWebhook;
      
      console.log('✅ [DIRECTUS WEBHOOK] User created:', {
        userId: userWebhook.payload.id,
        email: userWebhook.payload.email,
        provider: userWebhook.payload.provider
      });
      
      // Cache the user creation for immediate lookup
      userCache.set(userWebhook.payload.email.toLowerCase(), {
        userId: userWebhook.payload.id,
        email: userWebhook.payload.email,
        timestamp: Date.now()
      });
      
      authLogger.info('User creation cached via webhook', {
        userId: userWebhook.payload.id,
        email: userWebhook.payload.email,
        provider: userWebhook.payload.provider
      });
    }

    // Handle user verification/update events
    if (webhook.event === 'users.update' && webhook.collection === 'directus_users') {
      const userWebhook = webhook as UserVerifiedWebhook;
      
      console.log('✅ [DIRECTUS WEBHOOK] User updated:', {
        userId: userWebhook.payload.id,
        email: userWebhook.payload.email,
        status: userWebhook.payload.status
      });
      
      // Update cache if user exists
      const existing = userCache.get(userWebhook.payload.email.toLowerCase());
      if (existing) {
        userCache.set(userWebhook.payload.email.toLowerCase(), {
          ...existing,
          timestamp: Date.now()
        });
      }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.log('❌ [DIRECTUS WEBHOOK] Error processing webhook:', error);
    authLogger.error('Webhook processing error', error as Error);
    
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Export the cache for use in other modules
export { userCache };