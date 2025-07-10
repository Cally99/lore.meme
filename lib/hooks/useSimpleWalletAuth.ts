// lib/hooks/useSimpleWalletAuth.ts
'use client';

import { useState, useCallback, useEffect } from 'react';
import { useConnect, useAccount, useSignMessage, useDisconnect } from 'wagmi';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';

// Simple localStorage session management
interface SimpleWalletSession {
  walletAddress: string;
  token: string;
  expiresAt: number;
  verified: boolean;
}

const WALLET_SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

const storeWalletSession = (session: SimpleWalletSession) => {
  const key = `simple_wallet_${session.walletAddress.toLowerCase()}`;
  localStorage.setItem(key, JSON.stringify(session));
};

const getStoredWalletSession = (address: string): SimpleWalletSession | null => {
  try {
    const key = `simple_wallet_${address.toLowerCase()}`;
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    
    const session = JSON.parse(stored);
    if (Date.now() > session.expiresAt) {
      localStorage.removeItem(key);
      return null;
    }
    
    return session;
  } catch (error) {
    console.log('❌ [SIMPLE WALLET] Error retrieving session:', error);
    return null;
  }
};

export const useSimpleWalletAuth = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { connect, connectors } = useConnect();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();
  const router = useRouter();

  // Log available connectors
  useEffect(() => {
    console.log('🔍 [SIMPLE WALLET] Available connectors:', {
      total: connectors.length,
      connectors: connectors.map(c => ({ id: c.id, name: c.name, type: c.type }))
    });
  }, [connectors]);

  // Auto-trigger authentication when wallet connects
  useEffect(() => {
    if (isConnected && address && !isConnecting) {
      console.log('🔍 [SIMPLE WALLET] Wallet connected, triggering authentication');
      authenticateWallet();
    }
  }, [isConnected, address, isConnecting]);

  const connectWallet = useCallback(async (walletId: string) => {
    console.log('🔍 [SIMPLE WALLET] Connecting wallet:', walletId);
    console.log('🔍 [SIMPLE WALLET] Available connectors:', connectors.map(c => ({ id: c.id, name: c.name, type: c.type })));
    setIsConnecting(true);
    setError(null);
    
    try {
      let connector;
      
      switch (walletId) {
        case 'metamask':
          console.log('🔍 [SIMPLE WALLET] Looking for MetaMask connector...');
          connector = connectors.find(c => c.id === 'metaMask');
          console.log('🔍 [SIMPLE WALLET] Found MetaMask connector:', connector ? { id: connector.id, name: connector.name } : 'NOT FOUND');
          if (!connector) {
            console.log('❌ [SIMPLE WALLET] MetaMask connector not found. Available connectors:', connectors.map(c => c.id));
            throw new Error('MetaMask not available - metaMask connector not found');
          }
          break;
        case 'walletconnect':
          connector = connectors.find(c => c.id === 'walletConnect');
          if (!connector) throw new Error('WalletConnect not available');
          break;
        case 'coinbase':
          connector = connectors.find(c => c.id === 'coinbaseWallet');
          if (!connector) throw new Error('Coinbase Wallet not available');
          break;
        case 'other':
          // Open Web3Modal for other wallets
          const { appKit } = await import('@/lib/web3modal/config');
          if (!appKit) throw new Error('Web3Modal not available');
          await appKit.open();
          return;
        default:
          throw new Error(`Unsupported wallet: ${walletId}`);
      }
      
      console.log('🔍 [SIMPLE WALLET] Attempting to connect with connector:', { id: connector.id, name: connector.name });
      await connect({ connector });
      console.log('✅ [SIMPLE WALLET] Connect call completed successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Wallet connection failed';
      console.log('❌ [SIMPLE WALLET] Connection failed:', errorMessage);
      console.log('❌ [SIMPLE WALLET] Full error:', error);
      setError(errorMessage);
      setIsConnecting(false);
    }
  }, [connectors, connect]);

  const authenticateWallet = useCallback(async (): Promise<void> => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }

    console.log('🔍 [SIMPLE WALLET] Starting authentication for:', address);
    
    try {
      // Check for existing session first
      const existingSession = getStoredWalletSession(address);
      if (existingSession && existingSession.verified) {
        console.log('✅ [SIMPLE WALLET] Found existing session, auto-login');
        
        const signInResponse = await signIn('credentials', {
          redirect: false,
          walletAddress: address,
          walletToken: existingSession.token,
        });
        
        if (signInResponse?.ok) {
          console.log('✅ [SIMPLE WALLET] Auto-login successful');
          setIsConnecting(false);
          
          // Close any open modals first
          try {
            const { appKit } = await import('@/lib/web3modal/config');
            if (appKit) {
              appKit.close();
            }
          } catch (error) {
            console.log('⚠️ [SIMPLE WALLET] Could not close modal:', error);
          }
          
          // Force page refresh to update session state
          console.log('🔄 [SIMPLE WALLET] Refreshing page to update session state');
          setTimeout(() => {
            window.location.reload();
          }, 100);
          return;
        } else {
          console.log('⚠️ [SIMPLE WALLET] Auto-login failed, proceeding with new authentication');
          localStorage.removeItem(`simple_wallet_${address.toLowerCase()}`);
        }
      }

      // New authentication flow
      await performSimpleWalletAuth(address);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      console.log('❌ [SIMPLE WALLET] Authentication failed:', errorMessage);
      setError(errorMessage);
      
      if (isConnected) {
        disconnect();
      }
      
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [isConnected, address, signMessageAsync, disconnect, router]);

  const performSimpleWalletAuth = async (walletAddress: string): Promise<void> => {
    console.log('🔍 [SIMPLE WALLET] Starting simple authentication flow');
    
    // Step 1: Get nonce
    const nonceRes = await fetch('/api/auth/simple-wallet/nonce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress }),
    });

    if (!nonceRes.ok) {
      const errorData = await nonceRes.json().catch(() => ({ error: 'Failed to get nonce' }));
      throw new Error(errorData.error || 'Failed to get nonce');
    }

    const { nonce } = await nonceRes.json();
    console.log('✅ [SIMPLE WALLET] Nonce received');

    // Step 2: Sign message
    const message = `Sign in to Lore.meme\nNonce: ${nonce}\nAddress: ${walletAddress}`;
    console.log('🔍 [SIMPLE WALLET] Requesting signature for message:', message);
    
    const signature = await signMessageAsync({
      message,
      account: walletAddress as `0x${string}`
    });
    console.log('✅ [SIMPLE WALLET] Signature received');

    // Step 3: Verify and authenticate
    const verifyRes = await fetch('/api/auth/simple-wallet/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress,
        signature,
        message,
        nonce
      }),
    });

    if (!verifyRes.ok) {
      const errorData = await verifyRes.json().catch(() => ({ error: 'Verification failed' }));
      throw new Error(errorData.error || 'Verification failed');
    }

    const { token } = await verifyRes.json();
    console.log('✅ [SIMPLE WALLET] Verification successful');

    // Step 4: Sign in with NextAuth
    const signInResponse = await signIn('credentials', {
      redirect: false,
      walletAddress,
      walletToken: token,
    });

    if (signInResponse?.error) {
      throw new Error(signInResponse.error);
    }
    
    if (!signInResponse?.ok) {
      throw new Error('NextAuth sign-in failed');
    }

    // Store session for future use
    const walletSession: SimpleWalletSession = {
      walletAddress: walletAddress.toLowerCase(),
      token,
      expiresAt: Date.now() + WALLET_SESSION_DURATION,
      verified: true
    };
    
    storeWalletSession(walletSession);
    console.log('✅ [SIMPLE WALLET] Authentication completed and session stored');
    
    // Close any open modals first
    try {
      const { appKit } = await import('@/lib/web3modal/config');
      if (appKit) {
        appKit.close();
      }
    } catch (error) {
      console.log('⚠️ [SIMPLE WALLET] Could not close modal:', error);
    }
    
    // Force page refresh to update the UI with the new session
    console.log('🔄 [SIMPLE WALLET] Refreshing page to update session state');
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  const handleDisconnect = useCallback(() => {
    if (address) {
      localStorage.removeItem(`simple_wallet_${address.toLowerCase()}`);
    }
    disconnect();
    setError(null);
    setIsConnecting(false);
  }, [address, disconnect]);

  return {
    connectWallet,
    authenticateWallet,
    isConnecting,
    error,
    isConnected,
    address,
    disconnect: handleDisconnect,
  };
};