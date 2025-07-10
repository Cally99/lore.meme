// lib/auth/sse-client.ts
import { authLogger } from '@/lib/monitoring/logger';

export interface SSEAuthEvent {
  type: 'connection-established' | 'auth-event' | 'session-expired' | 'heartbeat';
  sessionId: string;
  data: {
    status?: string;
    event?: any;
    nextAction?: 'wait' | 'auto-login' | 'redirect' | 'retry' | 'restart';
    message?: string;
    timestamp?: string;
  };
  timestamp: string;
}

export interface AuthNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  action?: 'retry' | 'switch-tab' | 'contact-support';
  autoHide: boolean;
  duration?: number;
}

export class AuthSSEClient {
  private eventSource: EventSource | null = null;
  private sessionId: string | null = null;
  private onEvent: (event: SSEAuthEvent) => void;
  private onError: (error: Error) => void;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private isConnected = false;

  constructor(
    onEvent: (event: SSEAuthEvent) => void,
    onError: (error: Error) => void = () => {}
  ) {
    this.onEvent = onEvent;
    this.onError = onError;
  }

  connect(sessionId: string): void {
    if (this.eventSource) {
      this.disconnect();
    }

    this.sessionId = sessionId;
    this.isConnected = false;
    
    try {
      const url = `/api/auth/sse?session=${encodeURIComponent(sessionId)}`;
      this.eventSource = new EventSource(url);

      this.eventSource.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        authLogger.info('SSE connection opened', { sessionId });
      };

      this.eventSource.onmessage = (event) => {
        try {
          const authEvent: SSEAuthEvent = JSON.parse(event.data);
          this.onEvent(authEvent);
        } catch (error) {
          authLogger.error('Failed to parse SSE event', error as Error);
        }
      };

      this.eventSource.onerror = (error) => {
        this.isConnected = false;
        authLogger.warn('SSE connection error', { sessionId, error });
        
        if (this.eventSource?.readyState === EventSource.CLOSED) {
          this.handleConnectionError();
        }
      };

    } catch (error) {
      authLogger.error('Failed to create SSE connection', error as Error);
      this.onError(error as Error);
    }
  }

  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isConnected = false;
    this.sessionId = null;
    authLogger.info('SSE connection closed');
  }

  private handleConnectionError(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      const error = new Error('Max reconnection attempts reached');
      authLogger.error('SSE reconnection failed', error);
      this.onError(error);
      return;
    }

    this.reconnectAttempts++;
    const delay = this.getBackoffDelay();
    
    authLogger.info('Attempting SSE reconnection', {
      attempt: this.reconnectAttempts,
      delay,
      sessionId: this.sessionId
    });

    setTimeout(() => {
      if (this.sessionId) {
        this.connect(this.sessionId);
      }
    }, delay);
  }

  private getBackoffDelay(): number {
    // Exponential backoff with jitter
    const baseDelay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter
    return Math.min(baseDelay + jitter, 30000); // Cap at 30 seconds
  }

  getConnectionStatus(): 'connecting' | 'connected' | 'disconnected' | 'error' {
    if (!this.eventSource) return 'disconnected';
    
    switch (this.eventSource.readyState) {
      case EventSource.CONNECTING:
        return 'connecting';
      case EventSource.OPEN:
        return this.isConnected ? 'connected' : 'connecting';
      case EventSource.CLOSED:
        return this.reconnectAttempts > 0 ? 'error' : 'disconnected';
      default:
        return 'disconnected';
    }
  }

  isConnectionActive(): boolean {
    return this.isConnected && this.eventSource?.readyState === EventSource.OPEN;
  }
}

// Utility function to create notifications from SSE events
export function createNotificationFromEvent(event: SSEAuthEvent): AuthNotification | null {
  const { type, data } = event;
  
  switch (type) {
    case 'connection-established':
      return {
        id: `conn-${Date.now()}`,
        type: 'info',
        message: 'Connected to authentication service',
        autoHide: true,
        duration: 3000
      };
      
    case 'auth-event':
      if (data.status === 'ready-for-login') {
        return {
          id: `ready-${Date.now()}`,
          type: 'success',
          message: 'Account created successfully! Logging you in...',
          autoHide: true,
          duration: 5000
        };
      }
      if (data.status === 'failed') {
        return {
          id: `failed-${Date.now()}`,
          type: 'error',
          message: 'Authentication failed. Please try again.',
          action: 'retry',
          autoHide: false
        };
      }
      break;
      
    case 'session-expired':
      return {
        id: `expired-${Date.now()}`,
        type: 'warning',
        message: 'Session expired. Please start over.',
        action: 'retry',
        autoHide: false
      };
      
    default:
      return null;
  }
  
  return null;
}