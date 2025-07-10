// types/auth/events.ts
export interface AuthEvent {
  id: string;
  type: 'user-created' | 'user-verified' | 'auth-success' | 'auth-failed' | 'session-expired';
  userId: string;
  email: string;
  sessionId: string;
  timestamp: Date;
  metadata: Record<string, any>;
}

export interface SSEAuthEvent {
  type: 'user-ready' | 'auth-success' | 'auth-error' | 'session-expired' | 'user-created' | 'auto-login-start';
  sessionId: string;
  data: {
    userId?: string;
    email: string;
    nextAction: 'auto-login' | 'manual-login' | 'retry' | 'error-recovery' | 'wait';
    message: string;
    progress?: number; // 0-100 for progress indication
  };
}

export interface AuthNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  action?: 'retry' | 'switch-tab' | 'contact-support';
  autoHide: boolean;
  duration?: number;
}

export interface AuthEventPayload {
  sessionId: string;
  email: string;
  userId?: string;
  error?: string;
  metadata?: Record<string, any>;
}