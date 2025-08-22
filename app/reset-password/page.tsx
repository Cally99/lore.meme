// src/app/reset-password/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';

const resetPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{[key: string]: string}>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isValidatingToken, setIsValidatingToken] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (!tokenParam) {
      // Don't immediately show error - just set token as null and let form handle it
      setToken(null);
      setIsValidatingToken(false);
      return;
    }
    setToken(tokenParam);
    setIsValidatingToken(false);
  }, [searchParams]);

  const validateField = (field: 'password' | 'confirmPassword', value: string) => {
    const newErrors = { ...fieldErrors };

    if (field === 'password') {
      if (value && value.length < 8) {
        newErrors.password = 'Password must be at least 8 characters';
      } else {
        delete newErrors.password;
      }
      
      // Also check confirm password match if it exists
      if (confirmPassword && value !== confirmPassword) {
        newErrors.confirmPassword = "Passwords don't match";
      } else if (confirmPassword && value === confirmPassword) {
        delete newErrors.confirmPassword;
      }
    }

    if (field === 'confirmPassword') {
      if (value && value !== password) {
        newErrors.confirmPassword = "Passwords don't match";
      } else {
        delete newErrors.confirmPassword;
      }
    }

    setFieldErrors(newErrors);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      setError('This password reset link is invalid or has expired. Please request a new password reset link.');
      return;
    }

    try {
      // Validate form
      resetPasswordSchema.parse({ password, confirmPassword });
      setError(null);
      setFieldErrors({});
      setIsLoading(true);

      console.log('🔍 Attempting password reset...');
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Password reset failed');
      }

      console.log('✅ Password reset successful');
      
      // Immediately redirect to login with success message
      router.push('/?message=password-reset-success');

    } catch (error) {
      console.log('❌ Password reset error:', error);
      if (error instanceof z.ZodError) {
        const errors: {[key: string]: string} = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0].toString()] = err.message;
          }
        });
        setFieldErrors(errors);
        setError(null);
      } else if (error instanceof Error) {
        setError(error.message);
        setFieldErrors({});
      } else {
        setError('An unexpected error occurred');
        setFieldErrors({});
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while validating token
  if (isValidatingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-md space-y-6 p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Password Reset</h1>
            <p className="text-muted-foreground mt-2">
              Validating reset link...
            </p>
          </div>
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-6 p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-10">Password Reset</h1>
          <p className="text-muted-foreground mt-2 mb-5">
            Enter your new password below.
          </p>
        </div>

        {(!token && !isValidatingToken) && (
          <div className="bg-green-50 text-green-700 px-4 py-3 rounded-md text-sm border border-green-200">
            This password reset link is invalid or has expired. Please request a new password reset link.
          </div>
        )}

        {error && (
          <div className="bg-green-50 text-green-700 px-4 py-3 rounded-md text-sm border border-green-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  validateField('password', e.target.value);
                }}
                required
                minLength={8}
                disabled={isLoading}
                className={fieldErrors.password ? "border-green-300" : ""}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="text-sm text-green-700">{fieldErrors.password}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  validateField('confirmPassword', e.target.value);
                }}
                required
                disabled={isLoading}
                className={fieldErrors.confirmPassword ? "border-green-300" : ""}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {fieldErrors.confirmPassword && (
              <p className="text-sm text-green-700">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading || !token || Object.keys(fieldErrors).length > 0}>
            {isLoading ? 'Resetting Password...' : 'Reset Password'}
          </Button>
        </form>

        <div className="text-center text-sm">
          <span>
            Remember your password?{' '}
            <button 
              type="button"
              onClick={() => router.push('/')}
              className="text-primary hover:underline cursor-pointer"
            >
              Back to login
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}