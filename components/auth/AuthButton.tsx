// src/components/layout/AuthButton.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useDisconnect } from 'wagmi';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useAuthModal } from '@/providers/AuthModalProvider';

export function AuthButton() {
  const { data: session, status } = useSession();
  const { openModal } = useAuthModal();
  const { disconnect } = useDisconnect();
  const [shortAddress, setShortAddress] = useState<string | null>(null);

  // Format wallet address for display (if available)
  useEffect(() => {
    if (session?.user?.walletAddress) {
      const address = session.user.walletAddress;
      setShortAddress(`${address.slice(0, 6)}...${address.slice(-4)}`);
    } else {
      setShortAddress(null);
    }
  }, [session]);

  const handleLogout = async () => {
    console.log('🔍 [AUTH BUTTON] Starting logout process');

    try {
      // Step 1: Clear wallet localStorage sessions
      if (session?.user?.walletAddress) {
        const address = session.user.walletAddress;
        const key = `simple_wallet_${address.toLowerCase()}`;
        localStorage.removeItem(key);
        console.log('✅ [AUTH BUTTON] Cleared wallet session from localStorage');
      }

      // Step 2: Disconnect wagmi wallet connection
      disconnect();
      console.log('✅ [AUTH BUTTON] Disconnected wagmi wallet');

      // Step 3: Sign out from NextAuth
      await signOut({ redirect: false });
      console.log('✅ [AUTH BUTTON] NextAuth signout completed');
    } catch (error) {
      console.error('❌ [AUTH BUTTON] Logout error:', error);
      // Still attempt NextAuth signout even if wallet disconnect fails
      await signOut({ redirect: false });
    }
  };

  if (status === 'loading') {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled
        className="border-blue-500 text-blue-500 hover:bg-blue-500/10 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-400/10"
      >
        <svg
          className="animate-spin -ml-1 mr-2 size-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        Loading
      </Button>
    );
  }

  if (!session) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={openModal}
        className="border-blue-500 text-blue-500 hover:bg-blue-500/10 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-400/10"
      >
        <svg
          className="mr-2 size-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
        Login
      </Button>
    );
  }

  const displayName = shortAddress || session.user.name || session.user.email || 'Account';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2 border-blue-500 text-blue-500 hover:bg-blue-500/10 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-400/10"
        >
          {session.user.image ? (
            <img
              src={session.user.image}
              alt={displayName}
              className="size-5 rounded-full"
            />
          ) : (
            <div className="size-5 rounded-full bg-primary flex items-center justify-center text-xs text-primary-foreground">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <span>{displayName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">Profile</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">Settings</Link>
        </DropdownMenuItem>
        {(session.user.role === 'ADMIN' || session.user.role === 'CREATOR') && (
          <DropdownMenuItem asChild>
            <Link href="/admin">Admin Dashboard</Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>Log out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}