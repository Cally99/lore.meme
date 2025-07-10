// lib/auth/event-store.ts
import { AuthEvent, SSEAuthEvent, AuthEventPayload } from '@/types/auth/events';
import { authLogger } from '@/lib/monitoring/logger';

// In-memory store for development, can be replaced with Redis in production
class AuthEventStore {
  private events: Map<string, AuthEvent[]> = new Map();
  private subscribers: Map<string, Set<(event: SSEAuthEvent) => void>> = new Map();
  private sessionTimeouts: Map<string, NodeJS.Timeout> = new Map();
  
  private readonly SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_EVENTS_PER_SESSION = 50;

  constructor() {
    // Cleanup expired sessions every minute
    setInterval(() => this.cleanupExpiredSessions(), 60 * 1000);
  }

  /**
   * Store an authentication event
   */
  storeEvent(sessionId: string, event: Omit<AuthEvent, 'id' | 'timestamp'>): AuthEvent {
    const fullEvent: AuthEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: new Date(),
    };

    // Get or create event array for session
    const sessionEvents = this.events.get(sessionId) || [];
    sessionEvents.push(fullEvent);

    // Limit events per session to prevent memory issues
    if (sessionEvents.length > this.MAX_EVENTS_PER_SESSION) {
      sessionEvents.shift(); // Remove oldest event
    }

    this.events.set(sessionId, sessionEvents);

    // Reset session timeout
    this.resetSessionTimeout(sessionId);

    // Log the event
    authLogger.info('Auth event stored', {
      sessionId,
      eventType: event.type,
      userId: event.userId,
      email: event.email
    });

    return fullEvent;
  }

  /**
   * Get all events for a session
   */
  getSessionEvents(sessionId: string): AuthEvent[] {
    return this.events.get(sessionId) || [];
  }

  /**
   * Get the latest event for a session
   */
  getLatestEvent(sessionId: string): AuthEvent | null {
    const events = this.getSessionEvents(sessionId);
    return events.length > 0 ? events[events.length - 1] : null;
  }

  /**
   * Subscribe to real-time events for a session
   */
  subscribe(sessionId: string, callback: (event: SSEAuthEvent) => void): () => void {
    if (!this.subscribers.has(sessionId)) {
      this.subscribers.set(sessionId, new Set());
    }
    
    this.subscribers.get(sessionId)!.add(callback);

    // Return unsubscribe function
    return () => {
      const sessionSubscribers = this.subscribers.get(sessionId);
      if (sessionSubscribers) {
        sessionSubscribers.delete(callback);
        if (sessionSubscribers.size === 0) {
          this.subscribers.delete(sessionId);
        }
      }
    };
  }

  /**
   * Publish an SSE event to all subscribers of a session
   */
  publishSSEEvent(sessionId: string, event: SSEAuthEvent): void {
    const subscribers = this.subscribers.get(sessionId);
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          authLogger.error('Error in SSE event callback', error as Error);
        }
      });
    }

    authLogger.info('SSE event published', {
      sessionId,
      eventType: event.type,
      subscriberCount: subscribers?.size || 0
    });
  }

  /**
   * Create and publish an SSE event from an auth event
   */
  createAndPublishSSEEvent(sessionId: string, authEvent: AuthEvent, message: string, nextAction: SSEAuthEvent['data']['nextAction']): void {
    const sseEvent: SSEAuthEvent = {
      type: this.mapAuthEventToSSEType(authEvent.type),
      sessionId,
      data: {
        userId: authEvent.userId,
        email: authEvent.email,
        nextAction,
        message,
        progress: this.calculateProgress(sessionId, authEvent.type)
      }
    };

    this.publishSSEEvent(sessionId, sseEvent);
  }

  /**
   * Check if a session exists and is active
   */
  hasActiveSession(sessionId: string): boolean {
    return this.events.has(sessionId);
  }

  /**
   * Clear all events for a session
   */
  clearSession(sessionId: string): void {
    this.events.delete(sessionId);
    this.subscribers.delete(sessionId);
    
    const timeout = this.sessionTimeouts.get(sessionId);
    if (timeout) {
      clearTimeout(timeout);
      this.sessionTimeouts.delete(sessionId);
    }

    authLogger.info('Session cleared', { sessionId });
  }

  /**
   * Get session statistics
   */
  getSessionStats(sessionId: string): {
    eventCount: number;
    duration: number;
    status: string;
    subscriberCount: number;
  } {
    const events = this.getSessionEvents(sessionId);
    const subscribers = this.subscribers.get(sessionId);
    const latestEvent = this.getLatestEvent(sessionId);
    
    return {
      eventCount: events.length,
      duration: events.length > 0 ? Date.now() - events[0].timestamp.getTime() : 0,
      status: latestEvent?.type || 'unknown',
      subscriberCount: subscribers?.size || 0
    };
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private resetSessionTimeout(sessionId: string): void {
    // Clear existing timeout
    const existingTimeout = this.sessionTimeouts.get(sessionId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout
    const timeout = setTimeout(() => {
      this.handleSessionTimeout(sessionId);
    }, this.SESSION_TIMEOUT);

    this.sessionTimeouts.set(sessionId, timeout);
  }

  private handleSessionTimeout(sessionId: string): void {
    // Publish session expired event
    const expiredEvent: SSEAuthEvent = {
      type: 'session-expired',
      sessionId,
      data: {
        email: '',
        nextAction: 'retry',
        message: 'Session expired. Please try again.'
      }
    };

    this.publishSSEEvent(sessionId, expiredEvent);
    
    // Clear the session after a delay to allow the event to be delivered
    setTimeout(() => {
      this.clearSession(sessionId);
    }, 1000);
  }

  private cleanupExpiredSessions(): void {
    const now = Date.now();
    const expiredSessions: string[] = [];

    this.events.forEach((events, sessionId) => {
      if (events.length > 0) {
        const lastEventTime = events[events.length - 1].timestamp.getTime();
        if (now - lastEventTime > this.SESSION_TIMEOUT) {
          expiredSessions.push(sessionId);
        }
      }
    });

    expiredSessions.forEach(sessionId => {
      this.clearSession(sessionId);
    });

    if (expiredSessions.length > 0) {
      authLogger.info('Cleaned up expired sessions', { 
        count: expiredSessions.length,
        sessionIds: expiredSessions 
      });
    }
  }

  private mapAuthEventToSSEType(authEventType: AuthEvent['type']): SSEAuthEvent['type'] {
    switch (authEventType) {
      case 'user-created':
        return 'user-created';
      case 'user-verified':
        return 'user-ready';
      case 'auth-success':
        return 'auth-success';
      case 'auth-failed':
        return 'auth-error';
      case 'session-expired':
        return 'session-expired';
      default:
        return 'auth-error';
    }
  }

  private calculateProgress(sessionId: string, eventType: AuthEvent['type']): number {
    switch (eventType) {
      case 'user-created':
        return 25;
      case 'user-verified':
        return 50;
      case 'auth-success':
        return 100;
      case 'auth-failed':
        return 0;
      default:
        return 0;
    }
  }
}

// Singleton instance
export const authEventStore = new AuthEventStore();