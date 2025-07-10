// components/auth/WalletConnectButtons.tsx
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { useSimpleWalletAuth } from '@/lib/hooks/useSimpleWalletAuth';
import { useAuthModal } from '@/providers/AuthModalProvider';

// Real wallet icons (SVGs)
const MetaMaskIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M22.5 12.5c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10-10z" fill="#F6851B"/>
    <path d="M19.8 8.2l-1.5 2.3-1.2-2.8 2.7.5z" fill="#E2761B"/>
    <path d="M4.2 8.2l1.5 2.3 1.2-2.8-2.7.5z" fill="#E2761B"/>
    <path d="M12 16.5l-2.5-1.2 2.5 3.2 2.5-3.2-2.5 1.2z" fill="#D7C1B3"/>
  </svg>
);

const WalletConnectIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M7.5 8.5c3.5-3.5 9.2-3.5 12.7 0l.4.4c.2.2.2.5 0 .7l-1.4 1.4c-.1.1-.3.1-.4 0l-.5-.5c-2.4-2.4-6.4-2.4-8.8 0l-.6.6c-.1.1-.3.1-.4 0L7.1 9.7c-.2-.2-.2-.5 0-.7l.4-.5z" fill="#3B99FC"/>
    <path d="M19.5 12.5l1.2 1.2c.2.2.2.5 0 .7l-5.4 5.4c-.2.2-.5.2-.7 0l-3.8-3.8c0-.1-.1-.1-.2 0l-3.8 3.8c-.2.2-.5.2-.7 0l-5.4-5.4c-.2-.2-.2-.5 0-.7l1.2-1.2c.2-.2.5-.2.7 0l3.8 3.8c0 .1.1.1.2 0l3.8-3.8c.2-.2.5-.2.7 0l3.8 3.8c0 .1.1.1.2 0l3.8-3.8c.2-.2.5-.2.7 0z" fill="#3B99FC"/>
  </svg>
);

const CoinbaseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="12" fill="#0052FF"/>
    <path d="M12 4C7.6 4 4 7.6 4 12s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 13c-2.8 0-5-2.2-5-5s2.2-5 5-5 5 2.2 5 5-2.2 5-5 5z" fill="white"/>
    <rect x="9" y="9" width="6" height="6" rx="1" fill="#0052FF"/>
  </svg>
);

interface WalletConnectButtonsProps {
  disabled?: boolean;
}

export const WalletConnectButtons: React.FC<WalletConnectButtonsProps> = ({ disabled = false }) => {
  const { connectWallet, isConnecting, error, isConnected } = useSimpleWalletAuth();
  const { closeModal } = useAuthModal();

  // Close modal if already connected
  React.useEffect(() => {
    if (isConnected) {
      closeModal();
    }
  }, [isConnected, closeModal]);

  const handleWalletConnect = async (walletId: string) => {
    try {
      await connectWallet(walletId);
    } catch (error) {
      console.error('Wallet connection failed:', error);
    }
  };

  const wallets = [
    {
      id: 'metamask',
      name: 'MetaMask',
      icon: <MetaMaskIcon />,
      className: 'bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-900'
    },
    {
      id: 'coinbase',
      name: 'Coinbase Wallet',
      icon: <CoinbaseIcon />,
      className: 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-900'
    },
    {
      id: 'walletconnect',
      name: 'WalletConnect',
      icon: <WalletConnectIcon />,
      className: 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-900'
    }
  ];

  return (
    <div className="space-y-3">
      {wallets.map((wallet) => (
        <Button
          key={wallet.id}
          variant="outline"
          onClick={() => handleWalletConnect(wallet.id)}
          disabled={disabled || isConnecting}
          className={`w-full h-12 flex items-center justify-start gap-3 ${wallet.className} transition-all duration-200`}
        >
          <div className="flex-shrink-0">
            {wallet.icon}
          </div>
          <span className="font-medium">
            {isConnecting ? 'Connecting...' : `Continue with ${wallet.name}`}
          </span>
          {isConnecting && (
            <div className="ml-auto">
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          )}
        </Button>
      ))}
      
      {/* Browse all wallets button */}
      <Button
        variant="outline"
        onClick={() => handleWalletConnect('other')}
        disabled={disabled || isConnecting}
        className="w-full h-12 flex items-center justify-center gap-3 bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-900 transition-all duration-200"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="M16 10h4v4h-4a2 2 0 0 1 0-4" />
        </svg>
        <span className="font-medium">Browse 450+ Wallets</span>
      </Button>
      
      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
};