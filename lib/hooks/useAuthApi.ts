// @ts-nocheck

// src/lib/api/hooks/useAuthApi.ts
import { useState } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useDisconnect } from 'wagmi';
import { authClient } from '@/lib/api/clients/authClient';
import { UserRole } from '@/types/directus/auth';
import { authLogger } from '@/lib/monitoring/logger';

export function useAuthApi() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: session, update } = useSession();
  const { disconnect } = useDisconnect();
  const router = useRouter();

  // Clear errors
  const clearErrors = () => {
    setError(null);
  };

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

      // Step 2: Automatically sign in the user
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      if (result?.ok) {
        // Refresh session data
        await update();
        router.refresh();
        return { success: true, user: signupData.user };
      }

      throw new Error('Login after signup failed');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Signup failed';
      setError(errorMessage);
      authLogger.error('Email signup failed', error as Error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Email/Password login
  const signInWithEmail = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
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
        return { success: true };
      }

      throw new Error('Login failed');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setError(errorMessage);
      authLogger.error('Email login failed', error as Error);
      throw error;
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
        throw new Error(result.error);
      }

      if (result?.ok) {
        await update();
        router.refresh();
        return { success: true };
      }

      throw new Error(`${provider} login failed`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `${provider} login failed`;
      setError(errorMessage);
      authLogger.error(`${provider} login failed`, error as Error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Wallet authentication
  const signInWithWallet = async (address: string, signature: string, message: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn('wallet', {
        redirect: false,
        address,
        signature,
        message,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      if (result?.ok) {
        await update();
        router.refresh();
        return { success: true };
      }

      throw new Error('Wallet authentication failed');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Wallet authentication failed';
      setError(errorMessage);
      authLogger.error('Wallet authentication failed', error as Error);
      throw error;
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
      authLogger.error('Failed to get wallet nonce', error as Error);
      throw error;
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
      authLogger.error('Profile update failed', error as Error);
      throw error;
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
