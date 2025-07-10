// components/ui/LoadingScreen.tsx
import { LoadingSpinner } from './LoadingSpinner';

export function LoadingScreen({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
      <LoadingSpinner size="lg" />
      <p className="text-gray-600 dark:text-gray-400">{message}</p>
    </div>
  );
}