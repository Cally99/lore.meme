import { authLogger } from '@/lib/auth/logger';
import { signIn } from 'next-auth/react';

export interface SignupAndSigninResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    username?: string;
  };
  error?: string;
}

export const signUpAndSignIn = async (
  email: string,
  password: string,
  lastName?: string,
  onClose?: () => void
): Promise<SignupAndSigninResponse> => {
  try {
    console.log('🔍 [SIGNUP-SIGNIN] Starting signup flow with NextAuth credentials provider');
    
    // Use NextAuth credentials provider with signup flag
    const result = await signIn('credentials', {
      redirect: false,
      email: email.toLowerCase(),
      password,
      isSignup: 'true',
      username: lastName,
    });

    console.log('🔍 [SIGNUP-SIGNIN] NextAuth signIn result:', {
      ok: result?.ok,
      error: result?.error,
      status: result?.status
    });

    // Handle successful signup
    if (result?.ok && !result?.error) {
      authLogger.info('Signup and signin successful via NextAuth', { email });
      return {
        success: true,
        user: {
          id: '', // Will be populated by session
          email: email.toLowerCase(),
          username: lastName
        }
      };
    }

    // Handle user already exists case
    if (result?.error === 'ACCOUNT_EXISTS') {
      authLogger.info('User already exists, attempting to sign in', { email });
      
      // Try to sign in with existing credentials (without signup flag)
      const loginResult = await signIn('credentials', {
        redirect: false,
        email: email.toLowerCase(),
        password,
      });
      
      if (loginResult?.ok && !loginResult?.error) {
        authLogger.info('Existing user signed in successfully', { email });
        // Call onClose on successful sign-in
        if (onClose) {
          onClose();
        }
        return {
          success: true,
          user: {
            id: '', // Will be populated by session
            email: email.toLowerCase(),
            username: lastName
          }
        };
      }
      
      // If sign-in fails, return the error
      const errorMessage = loginResult?.error || 'Account exists but failed to sign in';
      authLogger.error('Failed to sign in existing user', new Error(errorMessage));
      // Call onClose even on error to close the modal
      if (onClose) {
        onClose();
      }
      return { success: false, error: errorMessage };
    }

    // Handle other errors
    const errorMessage = result?.error || 'Signup and signin failed';
    authLogger.error('Signup and signin failed via NextAuth', new Error(errorMessage));
    // Call onClose even on error to close the modal
    if (onClose) {
      onClose();
    }
    return { success: false, error: errorMessage };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Signup and signin failed';
    authLogger.error('Signup and signin error', error as Error);
    return { success: false, error: errorMessage };
  }
};