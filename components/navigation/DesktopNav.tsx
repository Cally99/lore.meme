// @ts-ignore
// DesktopNav.tsx
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useSession, signOut } from 'next-auth/react';
import { AuthButton } from '@/components/auth/AuthButton';
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useAuth } from '@/lib/hooks/useAuth';
import { useAuthModal } from "@/providers/AuthModalProvider";
import Image from 'next/image';
import ThemeToggle from '../theme-toggle';
import { TrendingUp } from 'lucide-react';

export default function DesktopNav() {
  const { data: session } = useSession();
  const { isAuthenticated, isLoreCreator } = useAuth();
  const { openModal } = useAuthModal();

  const handleSubmitLoreClick = (e: React.MouseEvent) => {
    if (!isAuthenticated) {
      e.preventDefault();
      openModal();
      return;
    }

    if (!isLoreCreator) {
      e.preventDefault();
      // Show a toast or alert about needing permissions
      alert('You need the "Lore Creator" role to submit token lore. Please contact an administrator.');
      return;
    }

    // Allow navigation to proceed
  };

  return (
    <header className="hidden md:flex container mx-auto py-6 px-4 items-center justify-between">
      <Link href="/" className="flex items-center gap-2">
        <Image className="h-8 w-8 gap-6" src="/Logo.png" alt="Lore.meme Logo" width={32} height={32} />
        <span className="text-xl font-bold bg-clip-text px-2 text-transparent bg-gradient-to-r from-blue-600 to-blue-400 dark:from-blue-400 dark:to-blue-300">Lore.meme</span>
      </Link>

      <div className="flex items-center gap-4">
        <nav className="flex items-center gap-6">
          <Link href="/all-tokens">
            <Button
              variant="outline"
              className="border-blue-500 text-blue-500 hover:bg-blue-500/10 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-400/10"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              All Tokens
            </Button>
          </Link>
          <Link href="/submit-lore" onClick={handleSubmitLoreClick}>
            <Button
              variant="outline"
              className="border-blue-500 text-blue-500 hover:bg-blue-500/10 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-400/10"
            >
              Submit Lore
              {isAuthenticated && !isLoreCreator && (
                <span className="ml-1 text-red-400">🔒</span>
              )}
            </Button>
          </Link>
          <Link href="/contact">
            <Button
              className="bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-700 hover:to-blue-500 dark:from-blue-500 dark:to-blue-400 dark:hover:from-blue-600 dark:hover:to-blue-500"
            >
              Contact Us
            </Button>
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <div className="flex flex-col items-end text-xs">
                <UserAvatar user={session.user} />
                {isLoreCreator && (
                  <span className="text-green-400 text-xs"></span>
                )}
              </div>
              <Button
                variant="outline"
                className="border-blue-500 text-blue-500 hover:bg-blue-500/10 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-400/10"
                onClick={() => signOut()}
              >
                Sign Out
              </Button>
            </>
          ) : (
            <AuthButton />
          )}
          <div className="border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300"></span>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}