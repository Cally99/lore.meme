// @ts-nocheck

// src/lib/api/hooks/useAuthApi.ts
import { useState, useCallback } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useDisconnect } from 'wagmi';
import { authClient } from '@/lib/api/clients/authClient';
import { UserRole } from '@/types/directus/auth';
import { authLogger } from '@/lib/monitoring/logger';
import { getErrorMessage, getErrorCode } from '@/lib/auth/error-codes';

export function useAuthApi() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{
    message: string;
    code: string;
    details?: any;
  } | null>(null);
  const { data: session, update } = useSession();
  const { disconnect } = useDisconnect();
  const router = useRouter();

  // Clear errors
  const clearErrors = useCallback(() => {
    setError(null);
  }, []);

  // Email/Password signup with auto-login
  const signUpWithEmail = async (email: string, password: string, username?: string, lastName?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Create user account
      const signupResponse = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          first_name: username, // Use username as first_name
          last_name: lastName,
        }),
      });

      const signupData = await signupResponse.json();

      if (!signupResponse.ok) {
        throw new Error(signupData.error || 'Signup failed');
      }

      // Step 2: Automatically sign in the user with retry mechanism
      const maxRetries = 3;
      const baseDelay = 500; // 500ms base delay
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const result = await signIn('credentials', {
            redirect: false,
            email,
            password,
          });

          if (result?.error) {
            // If it's not an ACCOUNT_NOT_FOUND error or we've exhausted retries, throw the error
            if (result.error !== 'ACCOUNT_NOT_FOUND' || attempt === maxRetries) {
              throw new Error(result.error);
            }
            
            // Wait before retrying with exponential backoff
            if (attempt < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, baseDelay * (attempt + 1)));
            }
          } else if (result?.ok) {
            // Success - break out of retry loop
            break;
          }
        } catch (error) {
          // If we've exhausted all retries, re-throw the error
          if (attempt === maxRetries) {
            throw error;
          }
          
          // Wait before retrying with exponential backoff
          await new Promise(resolve => setTimeout(resolve, baseDelay * (attempt + 1)));
        }
      }

      // Refresh session data
      await update();
      router.refresh();
      return { success: true, user: signupData.user };
    } catch (error) {
      const errorMessage = getErrorMessage(error instanceof Error ? error.message : 'Signup failed');
      const errorCode = getErrorCode(error instanceof Error ? error.message : 'Signup failed');
      setError({ message: errorMessage, code: errorCode, details: error });
      authLogger.error('Email signup failed', error as Error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Email/Password login (supports both email and username)
  const signInWithEmail = async (identifier: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email: identifier, // Map identifier to email for NextAuth
        password,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      if (result?.ok) {
        await update();
        router.refresh();
        return { success: true };
      }

      throw new Error('Login failed');
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : 'Login failed';
      const message = getErrorMessage(rawMessage);
      const code = getErrorCode(rawMessage);
      const errorObj = { message, code, details: error };
      setError(errorObj);
      authLogger.error('Email login failed', error as Error);
      throw errorObj;
    } finally {
      setIsLoading(false);
    }
  };

  // OAuth login (Google, GitHub)
  const signInWithProvider = async (provider: 'google' | 'github') => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn(provider, { redirect: false });
      
      if (result?.error) {
        // Handle specific error cases with user-friendly messages
        if (result.error.includes('CredentialsSignin')) {
          throw new Error('Invalid email or password. Please try again.');
        } else if (result.error.includes('Access denied')) {
          throw new Error('Access denied. Please contact support.');
        } else {
          throw new Error(result.error);
        }
      }

      if (result?.ok) {
        await update();
        router.refresh();
        return { success: true };
      }

      throw new Error(`${provider} login failed`);
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : `${provider} login failed`;
      const message = getErrorMessage(rawMessage);
      const code = getErrorCode(rawMessage);
      const errorObj = { message, code, details: error };
      setError(errorObj);
      authLogger.error(`${provider} login failed`, error as Error);
      throw errorObj;
    } finally {
      setIsLoading(false);
    }
  };

  // Wallet authentication
  const signInWithWallet = async (address: string, signature: string, message: string) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🔍 [USE AUTH API] Starting wallet authentication via credentials provider');
      
      // Use credentials provider with wallet parameters
      const result = await signIn('credentials', {
        redirect: false,
        walletAddress: address,
        walletToken: signature, // Use signature as token for simple wallet auth
      });

      console.log('🔍 [USE AUTH API] Wallet auth result:', {
        ok: result?.ok,
        error: result?.error
      });

      if (result?.error) {
        // Handle specific error cases with user-friendly messages
        if (result.error.includes('CredentialsSignin')) {
          throw new Error('Wallet authentication failed. Please try again.');
        } else if (result.error.includes('Access denied')) {
          throw new Error('Access denied. Please contact support.');
        } else {
          throw new Error(result.error);
        }
      }

      if (result?.ok) {
        await update();
        router.refresh();
        authLogger.info('Wallet authentication successful', { address });
        return { success: true };
      }

      throw new Error('Wallet authentication failed');
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : 'Wallet authentication failed';
      const message = getErrorMessage(rawMessage);
      const code = getErrorCode(rawMessage);
      const errorObj = { message, code, details: error };
      setError(errorObj);
      authLogger.error('Wallet authentication failed', error as Error);
      throw errorObj;
    } finally {
      setIsLoading(false);
    }
  };

  // Get wallet nonce
  const getWalletNonce = async (address: string) => {
    try {
      const response = await fetch('/api/auth/wallet/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });

      if (!response.ok) {
        throw new Error('Failed to get nonce');
      }

      const data = await response.json();
      return data.nonce;
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : 'Failed to get nonce';
      const message = getErrorMessage(rawMessage);
      const code = getErrorCode(rawMessage);
      const errorObj = { message, code, details: error };
      authLogger.error('Failed to get wallet nonce', error as Error);
      throw new Error(message);
    }
  };

  // Logout
  const logout = async () => {
    setIsLoading(true);
    try {
      console.log('🔍 [USE AUTH API] Starting logout process');
      
      // Step 1: Clear wallet localStorage sessions if wallet address exists
      if (session?.user?.walletAddress) {
        const address = session.user.walletAddress;
        const key = `simple_wallet_${address.toLowerCase()}`;
        localStorage.removeItem(key);
        console.log('✅ [USE AUTH API] Cleared wallet session from localStorage');
      }
      
      // Step 2: Disconnect wagmi wallet connection
      disconnect();
      console.log('✅ [USE AUTH API] Disconnected wagmi wallet');
      
      // Step 3: Sign out from NextAuth
      await signOut({ redirect: false });
      console.log('✅ [USE AUTH API] NextAuth signout completed');
      
      router.refresh();
    } catch (error) {
      console.error('❌ [USE AUTH API] Logout error:', error);
      const rawMessage = error instanceof Error ? error.message : 'Logout failed';
      const message = getErrorMessage(rawMessage);
      const code = getErrorCode(rawMessage);
      const errorObj = { message, code, details: error };
      setError(errorObj);
      authLogger.error('Logout failed', error as Error);
      // Still attempt NextAuth signout even if wallet disconnect fails
      await signOut({ redirect: false });
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  // Update user profile
  const updateProfile = async (updates: Partial<{ first_name: string; last_name: string; role: UserRole }>) => {
    if (!session?.user?.id) {
      throw new Error('No authenticated user');
    }

    setIsLoading(true);
    try {
      const updatedUser = await authClient.updateUser(session.user.id, updates);
      await update();
      return updatedUser;
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : 'Profile update failed';
      const message = getErrorMessage(rawMessage);
      const code = getErrorCode(rawMessage);
      const errorObj = { message, code, details: error };
      setError(errorObj);
      authLogger.error('Profile update failed', error as Error);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    // State
    isLoading,
    error,
    session,
    user: session?.user,
    isAuthenticated: !!session?.user,

    // Actions
    signUpWithEmail,
    signInWithEmail,
    signInWithProvider,
    signInWithWallet,
    getWalletNonce,
    logout,
    updateProfile,
    clearErrors,
  };
}
