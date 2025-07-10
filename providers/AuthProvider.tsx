// providers/AuthProvider.tsx
'use client';

import { SessionProvider } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center p-4">
        <LoadingSpinner size="md" />
        <span className="ml-2">Initializing auth...</span>
      </div>
    );
  }

  return (
    <SessionProvider
      // These settings prevent the slow session calls
      refetchInterval={0} // Disable automatic refetching
      refetchOnWindowFocus={false}
      refetchWhenOffline={false}
    >
      {children}
    </SessionProvider>
  );
}
