// Simple in-memory rate limiter without external dependencies
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const loginAttempts = new Map<string, RateLimitEntry>();
const signupAttempts = new Map<string, RateLimitEntry>();

// Clean up expired entries
function cleanupExpired(map: Map<string, RateLimitEntry>) {
  const now = Date.now();
  for (const [key, entry] of map.entries()) {
    if (now >= entry.resetTime) {
      map.delete(key);
    }
  }
}

export function checkRateLimit(identifier: string): boolean {
  cleanupExpired(loginAttempts);
  
  const now = Date.now();
  const entry = loginAttempts.get(identifier);
  
  if (!entry || now >= entry.resetTime) {
    loginAttempts.set(identifier, {
      count: 1,
      resetTime: now + (15 * 60 * 1000) // 15 minutes
    });
    return true;
  }
  
  if (entry.count >= 5) {
    return false;
  }
  
  entry.count += 1;
  return true;
}

export function resetRateLimit(identifier: string) {
  loginAttempts.delete(identifier);
}

export function getRemainingAttempts(identifier: string): number {
  cleanupExpired(loginAttempts);
  
  const entry = loginAttempts.get(identifier);
  if (!entry) return 5;
  
  return Math.max(0, 5 - entry.count);
}

export const rateLimiter = {
  checkLimit: (key: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000) => {
    cleanupExpired(signupAttempts);
    
    const now = Date.now();
    const entry = signupAttempts.get(key);
    
    if (!entry || now >= entry.resetTime) {
      signupAttempts.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
      return {
        allowed: true,
        remaining: maxAttempts - 1,
        resetTime: windowMs,
        totalAttempts: 1
      };
    }
    
    if (entry.count >= maxAttempts) {
      const remainingTime = entry.resetTime - now;
      return {
        allowed: false,
        remaining: 0,
        resetTime: remainingTime,
        totalAttempts: entry.count
      };
    }
    
    entry.count += 1;
    return {
      allowed: true,
      remaining: maxAttempts - entry.count,
      resetTime: windowMs,
      totalAttempts: entry.count
    };
  },
  
  reset: (key: string) => {
    signupAttempts.delete(key);
  }
};