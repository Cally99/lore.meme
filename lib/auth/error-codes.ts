export const AUTH_ERROR_CODES = {
  // Authentication errors
  INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  ACCOUNT_NOT_FOUND: 'AUTH_ACCOUNT_NOT_FOUND',
  ACCOUNT_LOCKED: 'AUTH_ACCOUNT_LOCKED',
  ACCOUNT_SUSPENDED: 'AUTH_ACCOUNT_SUSPENDED',
  EMAIL_NOT_VERIFIED: 'AUTH_EMAIL_NOT_VERIFIED',
  DUPLICATE_EMAIL: 'AUTH_DUPLICATE_EMAIL',
  
  // Input validation errors
  INVALID_EMAIL: 'AUTH_INVALID_EMAIL',
  INVALID_USERNAME: 'AUTH_INVALID_USERNAME',
  WEAK_PASSWORD: 'AUTH_WEAK_PASSWORD',
  PASSWORD_MISMATCH: 'AUTH_PASSWORD_MISMATCH',
  
  // Rate limiting
  TOO_MANY_ATTEMPTS: 'AUTH_TOO_MANY_ATTEMPTS',
  
  // Network/Server errors
  NETWORK_ERROR: 'AUTH_NETWORK_ERROR',
  SERVER_ERROR: 'AUTH_SERVER_ERROR',
  
  // OAuth errors
  OAUTH_CANCELLED: 'AUTH_OAUTH_CANCELLED',
  OAUTH_ACCESS_DENIED: 'AUTH_OAUTH_ACCESS_DENIED',
  
  // Wallet errors
  WALLET_CONNECTION_FAILED: 'AUTH_WALLET_CONNECTION_FAILED',
  WALLET_SIGNATURE_FAILED: 'AUTH_WALLET_SIGNATURE_FAILED',
} as const;

export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  [AUTH_ERROR_CODES.INVALID_CREDENTIALS]: 'Invalid email/username or password. Please try again.',
  [AUTH_ERROR_CODES.ACCOUNT_NOT_FOUND]: 'No account found with these credentials.',
  [AUTH_ERROR_CODES.ACCOUNT_LOCKED]: 'Your account has been locked due to security concerns. Please contact support.',
  [AUTH_ERROR_CODES.ACCOUNT_SUSPENDED]: 'Your account has been suspended. Please contact support.',
  [AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED]: 'Please verify your email address before logging in.',
  [AUTH_ERROR_CODES.TOO_MANY_ATTEMPTS]: 'Too many login attempts. Please try again later.',
  [AUTH_ERROR_CODES.NETWORK_ERROR]: 'Network error. Please check your connection and try again.',
  [AUTH_ERROR_CODES.SERVER_ERROR]: 'Server error. Please try again later.',
  [AUTH_ERROR_CODES.OAUTH_CANCELLED]: 'Sign-in was cancelled.',
  [AUTH_ERROR_CODES.OAUTH_ACCESS_DENIED]: 'Access denied. Please allow the requested permissions.',
  [AUTH_ERROR_CODES.WALLET_CONNECTION_FAILED]: 'Failed to connect wallet. Please try again.',
  [AUTH_ERROR_CODES.WALLET_SIGNATURE_FAILED]: 'Signature verification failed. Please try again.',
};

/**
 * Maps error messages to user-friendly error messages
 * @param errorMessage - The raw error message from the backend
 * @returns A user-friendly error message
 */
export function getErrorMessage(errorMessage: string): string {
  // Normalize the error message for matching
  const normalized = errorMessage.toLowerCase().trim();
  
  // Map common error patterns to our error messages
  const errorMappings: Record<string, string> = {
    'invalid credentials': AUTH_ERROR_MESSAGES[AUTH_ERROR_CODES.INVALID_CREDENTIALS],
    'user not found': AUTH_ERROR_MESSAGES[AUTH_ERROR_CODES.ACCOUNT_NOT_FOUND],
    'account not found': AUTH_ERROR_MESSAGES[AUTH_ERROR_CODES.ACCOUNT_NOT_FOUND],
    'no user found': AUTH_ERROR_MESSAGES[AUTH_ERROR_CODES.ACCOUNT_NOT_FOUND],
    'account locked': AUTH_ERROR_MESSAGES[AUTH_ERROR_CODES.ACCOUNT_LOCKED],
    'account suspended': AUTH_ERROR_MESSAGES[AUTH_ERROR_CODES.ACCOUNT_SUSPENDED],
    'email not verified': AUTH_ERROR_MESSAGES[AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED],
    'too many attempts': AUTH_ERROR_MESSAGES[AUTH_ERROR_CODES.TOO_MANY_ATTEMPTS],
    'rate limit': AUTH_ERROR_MESSAGES[AUTH_ERROR_CODES.TOO_MANY_ATTEMPTS],
    'network error': AUTH_ERROR_MESSAGES[AUTH_ERROR_CODES.NETWORK_ERROR],
    'connection failed': AUTH_ERROR_MESSAGES[AUTH_ERROR_CODES.NETWORK_ERROR],
    'server error': AUTH_ERROR_MESSAGES[AUTH_ERROR_CODES.SERVER_ERROR],
    'oauth cancelled': AUTH_ERROR_MESSAGES[AUTH_ERROR_CODES.OAUTH_CANCELLED],
    'oauth access denied': AUTH_ERROR_MESSAGES[AUTH_ERROR_CODES.OAUTH_ACCESS_DENIED],
    'wallet connection failed': AUTH_ERROR_MESSAGES[AUTH_ERROR_CODES.WALLET_CONNECTION_FAILED],
    'wallet signature failed': AUTH_ERROR_MESSAGES[AUTH_ERROR_CODES.WALLET_SIGNATURE_FAILED],
    'sign-in cancelled': AUTH_ERROR_MESSAGES[AUTH_ERROR_CODES.OAUTH_CANCELLED],
    'access denied': AUTH_ERROR_MESSAGES[AUTH_ERROR_CODES.OAUTH_ACCESS_DENIED],
    'password incorrect': AUTH_ERROR_MESSAGES[AUTH_ERROR_CODES.INVALID_CREDENTIALS],
    'wrong password': AUTH_ERROR_MESSAGES[AUTH_ERROR_CODES.INVALID_CREDENTIALS],
    'email already exists': 'An account with this email already exists. We\'ve switched to the login form for you.',
    'username already exists': 'This username is already taken. Please choose a different username.',
    'email already taken': 'An account with this email already exists. We\'ve switched to the login form for you.',
    'user already exists': 'An account with this email already exists. We\'ve switched to the login form for you.',
    'account already exists': 'An account with this email already exists. We\'ve switched to the login form for you.',
    'duplicate key value violates unique constraint': 'An account with this email already exists. We\'ve switched to the login form for you.',
    'duplicate entry': 'An account with this email already exists. We\'ve switched to the login form for you.',
    'invalid email': AUTH_ERROR_MESSAGES[AUTH_ERROR_CODES.INVALID_EMAIL],
    'invalid username': AUTH_ERROR_MESSAGES[AUTH_ERROR_CODES.INVALID_USERNAME],
    'weak password': AUTH_ERROR_MESSAGES[AUTH_ERROR_CODES.WEAK_PASSWORD],
    'password mismatch': AUTH_ERROR_MESSAGES[AUTH_ERROR_CODES.PASSWORD_MISMATCH],
  };
  
  // Find matching error message
  for (const [pattern, message] of Object.entries(errorMappings)) {
    if (normalized.includes(pattern)) {
      return message;
    }
  }
  
  // Return generic message for unknown errors
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Gets the error code for a given error message
 * @param errorMessage - The raw error message from the backend
 * @returns The corresponding error code
 */
export function getErrorCode(errorMessage: string): string {
  const normalized = errorMessage.toLowerCase().trim();
  
  const errorMappings: Record<string, string> = {
    'invalid credentials': AUTH_ERROR_CODES.INVALID_CREDENTIALS,
    'user not found': AUTH_ERROR_CODES.ACCOUNT_NOT_FOUND,
    'account not found': AUTH_ERROR_CODES.ACCOUNT_NOT_FOUND,
    'no user found': AUTH_ERROR_CODES.ACCOUNT_NOT_FOUND,
    'account locked': AUTH_ERROR_CODES.ACCOUNT_LOCKED,
    'account suspended': AUTH_ERROR_CODES.ACCOUNT_SUSPENDED,
    'email not verified': AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED,
    'too many attempts': AUTH_ERROR_CODES.TOO_MANY_ATTEMPTS,
    'rate limit': AUTH_ERROR_CODES.TOO_MANY_ATTEMPTS,
    'network error': AUTH_ERROR_CODES.NETWORK_ERROR,
    'connection failed': AUTH_ERROR_CODES.NETWORK_ERROR,
    'server error': AUTH_ERROR_CODES.SERVER_ERROR,
    'oauth cancelled': AUTH_ERROR_CODES.OAUTH_CANCELLED,
    'oauth access denied': AUTH_ERROR_CODES.OAUTH_ACCESS_DENIED,
    'wallet connection failed': AUTH_ERROR_CODES.WALLET_CONNECTION_FAILED,
    'wallet signature failed': AUTH_ERROR_CODES.WALLET_SIGNATURE_FAILED,
    'email already exists': AUTH_ERROR_CODES.DUPLICATE_EMAIL,
    'email already taken': AUTH_ERROR_CODES.DUPLICATE_EMAIL,
    'user already exists': AUTH_ERROR_CODES.DUPLICATE_EMAIL,
    'account already exists': AUTH_ERROR_CODES.DUPLICATE_EMAIL,
    'duplicate key value violates unique constraint': AUTH_ERROR_CODES.DUPLICATE_EMAIL,
    'duplicate entry': AUTH_ERROR_CODES.DUPLICATE_EMAIL,
  };
  
  for (const [pattern, code] of Object.entries(errorMappings)) {
    if (normalized.includes(pattern)) {
      return code;
    }
  }
  
  return 'UNKNOWN_ERROR';
}