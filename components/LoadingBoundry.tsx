// components/LoadingBoundary.tsx
'use client';

import { Suspense } from 'react';

interface LoadingBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function LoadingBoundary({ 
  children, 
  fallback = <div className="animate-pulse">Loading...</div> 
}: LoadingBoundaryProps) {
  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  );
}
