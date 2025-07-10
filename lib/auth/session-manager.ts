// lib/auth/session-manager.ts
import { AuthSession, SessionManagerConfig } from '@/types/auth/sessions';
import { authLogger } from '@/lib/monitoring/logger';

class AuthSessionManager {
  private sessions: Map<string, AuthSession> = new Map();
  private config: SessionManagerConfig;

  constructor(config?: Partial<SessionManagerConfig>) {
    this.config = {
      sessionTimeout: 15 * 60 * 1000, // 15 minutes (increased for wallet auth)
      maxAttempts: 3,
      cleanupInterval: 5 * 60 * 1000, // 5 minutes (less aggressive cleanup)
      retryDelay: 1000, // 1 second
      ...config
    };

    // Start cleanup interval
    setInterval(() => this.cleanupExpiredSessions(), this.config.cleanupInterval);
  }

  /**
   * Create a new authentication session
   */
  createSession(email: string, metadata: AuthSession['metadata'] = {}): AuthSession {
    const sessionId = this.generateSessionId();
    const now = new Date();
    
    const session: AuthSession = {
      id: sessionId,
      email: email.toLowerCase(),
      status: 'pending-creation',
      createdAt: now,
      expiresAt: new Date(now.getTime() + this.config.sessionTimeout),
      attempts: 0,
      metadata: {
        userAgent: metadata.userAgent,
        ip: metadata.ip,
        provider: metadata.provider || 'credentials',
        ...metadata
      }
    };

    this.sessions.set(sessionId, session);

    authLogger.info('Auth session created', {
      sessionId,
      email: session.email,
      provider: session.metadata.provider
    });

    return session;
  }

  /**
   * Get a session by ID
   */
  getSession(sessionId: string): AuthSession | null {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }

    // Check if session is expired
    if (this.isSessionExpired(session)) {
      this.expireSession(sessionId);
      return null;
    }

    return session;
  }

  /**
   * Update session status
   */
  updateSessionStatus(
    sessionId: string, 
    status: AuthSession['status'], 
    eventData?: { type: string; data: any }
  ): AuthSession | null {
    const session = this.getSession(sessionId);
    
    if (!session) {
      authLogger.warn('Attempted to update non-existent session', { sessionId, status });
      return null;
    }

    session.status = status;
    
    if (eventData) {
      session.lastEvent = {
        type: eventData.type,
        timestamp: new Date(),
        data: eventData.data
      };
    }

    // Extend session expiry on successful updates
    if (status === 'authenticated' || status === 'ready-for-login') {
      session.expiresAt = new Date(Date.now() + this.config.sessionTimeout);
    }

    this.sessions.set(sessionId, session);

    authLogger.info('Session status updated', {
      sessionId,
      status,
      email: session.email
    });

    return session;
  }

  /**
   * Increment session attempts
   */
  incrementAttempts(sessionId: string): AuthSession | null {
    const session = this.getSession(sessionId);
    
    if (!session) {
      return null;
    }

    session.attempts += 1;

    // Mark as failed if max attempts reached
    if (session.attempts >= this.config.maxAttempts) {
      session.status = 'failed';
      authLogger.warn('Session failed due to max attempts', {
        sessionId,
        attempts: session.attempts,
        email: session.email
      });
    }

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Set user ID for a session
   */
  setSessionUserId(sessionId: string, userId: string): AuthSession | null {
    const session = this.getSession(sessionId);
    
    if (!session) {
      return null;
    }

    session.metadata.userId = userId;
    this.sessions.set(sessionId, session);

    authLogger.info('Session user ID set', {
      sessionId,
      userId,
      email: session.email
    });

    return session;
  }

  /**
   * Check if session can attempt authentication
   */
  canAttemptAuth(sessionId: string): boolean {
    const session = this.getSession(sessionId);
    
    if (!session) {
      return false;
    }

    return session.attempts < this.config.maxAttempts && 
           session.status !== 'failed' && 
           session.status !== 'expired';
  }

  /**
   * Get session by email (for finding existing sessions)
   */
  getSessionByEmail(email: string): AuthSession | null {
    const normalizedEmail = email.toLowerCase();
    console.log('🔍 [SESSION MANAGER] Looking for session with email:', normalizedEmail);
    console.log('🔍 [SESSION MANAGER] Total sessions in memory:', this.sessions.size);
    
    const matchingSessions: AuthSession[] = [];
    for (const session of this.sessions.values()) {
      console.log('🔍 [SESSION MANAGER] Checking session:', {
        id: session.id,
        email: session.email,
        status: session.status,
        expired: this.isSessionExpired(session),
        expiresAt: session.expiresAt
      });
      
      if (session.email === normalizedEmail) {
        matchingSessions.push(session);
        if (!this.isSessionExpired(session)) {
          console.log('✅ [SESSION MANAGER] Found valid session:', session.id);
          return session;
        } else {
          console.log('❌ [SESSION MANAGER] Session expired:', session.id);
        }
      }
    }

    console.log('🔍 [SESSION MANAGER] Total matching sessions found:', matchingSessions.length);
    console.log('❌ [SESSION MANAGER] No valid session found for email:', normalizedEmail);
    return null;
  }

  /**
   * Expire a session
   */
  expireSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    
    if (session) {
      session.status = 'expired';
      session.expiresAt = new Date(); // Set to now
      this.sessions.set(sessionId, session);

      authLogger.info('Session expired', {
        sessionId,
        email: session.email
      });
    }
  }

  /**
   * Delete a session completely
   */
  deleteSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    
    if (session) {
      this.sessions.delete(sessionId);
      
      authLogger.info('Session deleted', {
        sessionId,
        email: session.email
      });
    }
  }

  /**
   * Get all active sessions (for monitoring)
   */
  getActiveSessions(): AuthSession[] {
    const activeSessions: AuthSession[] = [];
    
    for (const session of this.sessions.values()) {
      if (!this.isSessionExpired(session)) {
        activeSessions.push(session);
      }
    }

    return activeSessions;
  }

  /**
   * Get session statistics
   */
  getSessionStats(): {
    total: number;
    active: number;
    expired: number;
    failed: number;
    authenticated: number;
  } {
    let active = 0;
    let expired = 0;
    let failed = 0;
    let authenticated = 0;

    for (const session of this.sessions.values()) {
      if (this.isSessionExpired(session) || session.status === 'expired') {
        expired++;
      } else if (session.status === 'failed') {
        failed++;
      } else if (session.status === 'authenticated') {
        authenticated++;
      } else {
        active++;
      }
    }

    return {
      total: this.sessions.size,
      active,
      expired,
      failed,
      authenticated
    };
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
  }

  private isSessionExpired(session: AuthSession): boolean {
    return new Date() > session.expiresAt;
  }

  private cleanupExpiredSessions(): void {
    console.log('🔍 [SESSION CLEANUP] Starting cleanup, total sessions:', this.sessions.size);
    const expiredSessionIds: string[] = [];
    
    for (const [sessionId, session] of this.sessions.entries()) {
      console.log('🔍 [SESSION CLEANUP] Checking session:', {
        id: sessionId,
        email: session.email,
        status: session.status,
        expiresAt: session.expiresAt,
        isExpired: this.isSessionExpired(session),
        timeUntilExpiry: session.expiresAt.getTime() - Date.now()
      });
      
      if (this.isSessionExpired(session)) {
        expiredSessionIds.push(sessionId);
        console.log('❌ [SESSION CLEANUP] Marking for deletion:', sessionId);
      } else {
        console.log('✅ [SESSION CLEANUP] Session still valid:', sessionId);
      }
    }

    expiredSessionIds.forEach(sessionId => {
      console.log('🗑️ [SESSION CLEANUP] Deleting session:', sessionId);
      this.deleteSession(sessionId);
    });

    console.log('🔍 [SESSION CLEANUP] Cleanup complete, deleted:', expiredSessionIds.length, 'remaining:', this.sessions.size);
    if (expiredSessionIds.length > 0) {
      authLogger.info('Cleaned up expired sessions', {
        count: expiredSessionIds.length
      });
    }
  }
}

// Global singleton instance with proper caching
declare global {
  var __authSessionManager: AuthSessionManager | undefined;
}

function getAuthSessionManager(): AuthSessionManager {
  if (typeof window !== 'undefined') {
    // Client-side: create new instance (shouldn't be used but safety)
    return new AuthSessionManager();
  }

  // Server-side: use global singleton
  if (!global.__authSessionManager) {
    console.log('🔍 [SESSION MANAGER] Creating new global singleton instance');
    global.__authSessionManager = new AuthSessionManager();
  } else {
    console.log('🔍 [SESSION MANAGER] Reusing existing global singleton instance');
  }
  
  return global.__authSessionManager;
}

// Export the singleton getter
export const authSessionManager = getAuthSessionManager();

// Export the class for testing
export { AuthSessionManager };