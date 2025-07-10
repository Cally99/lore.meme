// types/auth/sessions.ts
export interface AuthSession {
  id: string;
  email: string;
  status: 'pending-creation' | 'pending-verification' | 'ready-for-login' | 'authenticated' | 'failed' | 'expired';
  createdAt: Date;
  expiresAt: Date;
  attempts: number;
  lastEvent?: {
    type: string;
    timestamp: Date;
    data: any;
  };
  metadata: {
    userAgent?: string;
    ip?: string;
    provider?: string;
    userId?: string;
    walletAddress?: string;
    nonce?: string;
    [key: string]: any; // Allow additional metadata fields
  };
}

export interface AuthState {
  // Session tracking
  sessionId: string | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  
  // Flow states
  signupFlow: 'idle' | 'creating-user' | 'waiting-verification' | 'auto-login' | 'complete' | 'failed';
  loginFlow: 'idle' | 'authenticating' | 'complete' | 'failed';
  
  // Real-time events
  lastEvent: import('./events').SSEAuthEvent | null;
  eventHistory: import('./events').SSEAuthEvent[];
  
  // Error management (auto-clearing)
  errors: {
    signup: string | null;
    login: string | null;
    connection: string | null;
    general: string | null;
  };
  
  // User feedback
  notifications: import('./events').AuthNotification[];
  
  // Loading states
  isLoading: {
    signup: boolean;
    login: boolean;
    autoLogin: boolean;
  };
  
  // Form data
  activeTab: 'login' | 'signup';
  formData: {
    login: {
      email: string;
      password: string;
    };
    signup: {
      username: string;
      email: string;
      password: string;
      confirmPassword: string;
    };
  };
}

export interface SessionManagerConfig {
  sessionTimeout: number; // milliseconds
  maxAttempts: number;
  cleanupInterval: number; // milliseconds
  retryDelay: number; // milliseconds
}