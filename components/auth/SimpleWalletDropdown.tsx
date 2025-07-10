// components/auth/SimpleWalletDropdown.tsx
'use client';

import React from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useSimpleWalletAuth } from '@/lib/hooks/useSimpleWalletAuth';

interface WalletOption {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

// Simple wallet icons
const MetaMaskIcon = () => (
  <img
    src="/icons/logos/MetaMask-icon-fox.svg"
    alt="MetaMask"
    className="w-6 h-6"
  />
);

const WalletConnectIcon = () => (
  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
    <span className="text-white text-xs font-bold">W</span>
  </div>
);

const CoinbaseIcon = () => (
  <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
    <span className="text-white text-xs font-bold">C</span>
  </div>
);

const WalletIcon = () => (
  <div className="w-6 h-6 rounded-full bg-gray-500 flex items-center justify-center">
    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M16 10h4v4h-4a2 2 0 0 1 0-4" />
    </svg>
  </div>
);

const walletOptions: WalletOption[] = [
  {
    id: 'metamask',
    name: 'MetaMask',
    description: 'Connect using browser extension',
    icon: <MetaMaskIcon />
  },
  {
    id: 'walletconnect',
    name: 'WalletConnect',
    description: 'Scan QR code with mobile wallet',
    icon: <WalletConnectIcon />
  },
  {
    id: 'coinbase',
    name: 'Coinbase Wallet',
    description: 'Connect using Coinbase Wallet',
    icon: <CoinbaseIcon />
  },
  {
    id: 'other',
    name: 'Other Wallets',
    description: 'Browse 450+ supported wallets',
    icon: <WalletIcon />
  }
];

interface SimpleWalletDropdownProps {
  disabled?: boolean;
}

export const SimpleWalletDropdown: React.FC<SimpleWalletDropdownProps> = ({ disabled = false }) => {
  const { connectWallet, isConnecting, error } = useSimpleWalletAuth();

  const handleWalletSelect = async (walletId: string) => {
    try {
      await connectWallet(walletId);
    } catch (error) {
      console.error('Wallet connection failed:', error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          disabled={disabled || isConnecting} 
          className="p-2"
          title={isConnecting ? 'Connecting...' : 'Continue with Wallet'}
        >
          <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="M16 10h4v4h-4a2 2 0 0 1 0-4" />
          </svg>
          <span className="sr-only">
            {isConnecting ? 'Connecting...' : 'Continue with Wallet'}
          </span>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Connect Wallet</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Choose your preferred wallet</p>
        </div>
        
        {walletOptions.map((wallet) => (
          <DropdownMenuItem
            key={wallet.id}
            onClick={() => handleWalletSelect(wallet.id)}
            className="flex items-center space-x-3 p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 focus:bg-gray-50 dark:focus:bg-gray-700"
            disabled={isConnecting}
          >
            <div className="flex-shrink-0">
              {wallet.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{wallet.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{wallet.description}</p>
            </div>
            {isConnecting && (
              <div className="flex-shrink-0">
                <svg className="animate-spin h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            )}
          </DropdownMenuItem>
        ))}
        
        {error && (
          <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};