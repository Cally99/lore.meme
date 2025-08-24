// @ts-nocheck

// src/lib/api/hooks/useAuthApi.ts - Simplified version
import { useState, useCallback } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useDisconnect } from 'wagmi';
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

      // Step 2: Automatically sign in the user (simplified - no retry logic)
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      if (result?.ok) {
        await update();
        router.refresh();
        return { success: true, user: signupData.user };
      }

      throw new Error('Auto-login failed after signup');
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
      let userMessage = 'Invalid username or password. Please try again.';

      // Provide specific messages for common errors
      if (rawMessage.includes('CredentialsSignin')) {
        userMessage = 'Invalid username or password. Please try again.';
      } else if (rawMessage.includes('Access denied')) {
        userMessage = 'Access denied. Please contact support.';
      } else if (rawMessage.includes('Too many requests')) {
        userMessage = 'Too many login attempts. Please wait a few minutes before trying again.';
      }

      const message = getErrorMessage(rawMessage);
      const code = getErrorCode(rawMessage);
      const errorObj = { message: userMessage, code, details: error };
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
    clearErrors,
  };
}