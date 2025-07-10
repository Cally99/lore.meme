// hooks/useOptimizedData.ts
'use client';

import { useQuery } from '@tanstack/react-query';

export function useOptimizedTokens() {
  return useQuery({
    queryKey: ['tokens-all'],
    queryFn: async () => {
      // Fetch all data in one parallel request
      const [featured, recent, approved] = await Promise.all([
        fetch('/api/tokens?featured=true&limit=20').then(r => r.json()),
        fetch('/api/tokens?orderBy=added_date&limit=20').then(r => r.json()),
        fetch('/api/tokens?status=approved&limit=1000').then(r => r.json()),
      ]);

      return { featured, recent, approved };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    enabled: typeof window !== 'undefined', // Only fetch on client
  });
}
