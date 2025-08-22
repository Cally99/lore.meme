// Simple logger for authentication operations
export const authLogger = {
  info: (message: string, data?: any) => {
    console.log(`[Auth Info] ${message}`, data || '');
  },
  warn: (message: string, data?: any) => {
    console.warn(`[Auth Warning] ${message}`, data || '');
  },
  error: (message: string, error: Error | string) => {
    console.error(`[Auth Error] ${message}`, error);
  },
  debug: (message: string, data?: any) => {
    // Only log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Auth Debug] ${message}`, data || '');
    }
  }
};