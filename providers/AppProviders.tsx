// providers/AppProviders.tsx
'use client';

import { GoogleOAuthProvider } from '@react-oauth/google';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { getWagmiConfig } from '@/lib/wagmi/config';
import { ThemeProvider } from 'next-themes';
import AuthProvider from '@/providers/AuthProvider';
import { AuthModalProvider } from '@/providers/AuthModalProvider';
import { useEffect, useState, useRef } from 'react';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

// Singleton QueryClient with optimized settings
let queryClient: QueryClient | null = null;

function getQueryClient() {
  if (!queryClient) {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 5 * 60 * 1000, // 5 minutes
          gcTime: 10 * 60 * 1000, // 10 minutes (was cacheTime)
          refetchOnWindowFocus: false,
          refetchOnReconnect: false,
          retry: 1,
        },
      },
    });
  }
  return queryClient;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [wagmiConfig, setWagmiConfig] = useState(() => getWagmiConfig());
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return; // Prevent double initialization
    initRef.current = true;

    setMounted(true);
    setWagmiConfig(getWagmiConfig());
    
    // Initialize AppKit only once
    if (typeof window !== 'undefined') {
      import('@/lib/web3modal/config').catch(console.error);
    }
  }, []);

  if (!mounted) {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <LoadingScreen message="Initializing app..." />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={getQueryClient()}>
            <AuthProvider>
              <AuthModalProvider>
                {children}
              </AuthModalProvider>
            </AuthProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </GoogleOAuthProvider>
    </ThemeProvider>
  );
}
