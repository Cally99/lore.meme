// src/components/profile/WalletManager.tsx
'use client';

import { useState } from 'react';
import { User } from 'next-auth';
import { Button } from '@/components/ui/button';
import { useSimpleWalletAuth } from '@/lib/hooks/useSimpleWalletAuth';
import { appKit } from '@/lib/web3modal/config';
import { UserRole } from '@/types/directus/auth';

interface WalletManagerProps {
  user: User;
}

export function WalletManager({ user }: WalletManagerProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { connectWallet, disconnect, isConnecting: walletConnecting } = useSimpleWalletAuth();

  const walletAddress = (user as any).walletAddress;
  const hasWallet = !!walletAddress;

  const handleConnectWallet = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      
      // Use the connectWallet function from useSimpleWalletAuth
      await connectWallet('metamask'); // Default to MetaMask, could be made configurable
      setSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectWallet = async () => {
    try {
      setError(null);
      disconnect();
      setSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect wallet');
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="space-y-6 max-w-md">
      {success && (
        <div className="bg-green-50 text-green-700 px-4 py-3 rounded-md text-sm">
          ✅ Wallet {hasWallet ? 'disconnected' : 'connected'} successfully!
        </div>
      )}
      
      {error && (
        <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium mb-2">Connected Wallets</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Manage your connected cryptocurrency wallets for authentication.
          </p>
        </div>

        {hasWallet ? (
          <div className="border rounded-md p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">MetaMask Wallet</p>
                <p className="text-sm text-muted-foreground font-mono">
                  {formatAddress(walletAddress)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                  Connected
                </span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleDisconnectWallet}
                  disabled={isConnecting || walletConnecting}
                >
                  Disconnect
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="border rounded-md p-4 space-y-3">
            <div className="text-center py-6">
              <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M16 10h4v4h-4a2 2 0 0 1 0-4" />
                </svg>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                No wallets connected. Connect a wallet to enable cryptocurrency authentication.
              </p>
              <Button 
                onClick={handleConnectWallet}
                disabled={isConnecting || walletConnecting}
              >
                {isConnecting || walletConnecting ? 'Connecting...' : 'Connect Wallet'}
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <h4 className="font-medium">Supported Wallets</h4>
          <div className="grid grid-cols-1 gap-2">
            <div className="flex items-center justify-between p-3 border rounded-md">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <span className="text-orange-600 font-bold text-sm">M</span>
                </div>
                <div>
                  <p className="font-medium">MetaMask</p>
                  <p className="text-xs text-muted-foreground">Browser extension wallet</p>
                </div>
              </div>
              <span className="text-xs text-green-600">Supported</span>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-md">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-sm">W</span>
                </div>
                <div>
                  <p className="font-medium">WalletConnect</p>
                  <p className="text-xs text-muted-foreground">Mobile wallet connection</p>
                </div>
              </div>
              <span className="text-xs text-green-600">Supported</span>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-md">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-sm">C</span>
                </div>
                <div>
                  <p className="font-medium">Coinbase Wallet</p>
                  <p className="text-xs text-muted-foreground">Coinbase's self-custody wallet</p>
                </div>
              </div>
              <span className="text-xs text-green-600">Supported</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}