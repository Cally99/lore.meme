


// src/components/auth/AuthForm.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthApi } from '@/lib/hooks/useAuthApi';
import { useAuthModal } from '@/providers/AuthModalProvider';
import { useSimpleWalletAuth } from '@/lib/hooks/useSimpleWalletAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserRole } from '@/types/directus/auth';
import { z } from 'zod';

// Validation schemas
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

const signupSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const resetSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

export function AuthForm() {
  const [activeTab, setActiveTab] = useState('login');
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  // Signup form state
  const [signupUsername, setSignupUsername] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  // Reset password form state
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState(false);
  
  const {
    signInWithEmail,
    signUpWithEmail,
    error: authError,
    isLoading: isAuthLoading,
    clearErrors
  } = useAuthApi();
  
  const { connectWallet, isConnecting: isWalletConnecting } = useSimpleWalletAuth();
  
  const router = useRouter();
  const { closeModal } = useAuthModal();

  // Auto-clear errors when switching tabs
  useEffect(() => {
    clearErrors();
    setError(null);
  }, [activeTab, clearErrors]);


  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔍 Login form submitted:', { email: loginEmail });
    
    try {
      // Validate form
      loginSchema.parse({ email: loginEmail, password: loginPassword });
      setError(null);
      setSignupSuccess(false);
      
      console.log('🔍 Attempting login...');
      await signInWithEmail(loginEmail, loginPassword);
      
      console.log('✅ Login successful, closing modal');
      closeModal();
    } catch (error) {
      console.log('❌ Login error:', error);
      if (error instanceof z.ZodError) {
        setError(error.errors[0].message);
      } else {
        setError('An unexpected error occurred');
      }
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔍 Signup form submitted:', { email: signupEmail, username: signupUsername });
    
    try {
      // Validate form
      signupSchema.parse({
        username: signupUsername,
        email: signupEmail,
        password: signupPassword,
        confirmPassword: signupConfirmPassword
      });
      setError(null);
      
      console.log('🔍 Attempting signup...');
      // All signups get the WRITER role automatically - signUpWithEmail will auto-login
      await signUpWithEmail(signupEmail, signupPassword, signupUsername);
      
      console.log('✅ Signup successful and user logged in, closing modal');
      closeModal();
    } catch (error) {
      console.log('❌ Signup error:', error);
      if (error instanceof z.ZodError) {
        setError(error.errors[0].message);
      } else if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unexpected error occurred');
      }
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔍 Reset password form submitted:', { email: resetEmail });
    
    try {
      // Validate form
      resetSchema.parse({ email: resetEmail });
      setError(null);
      setIsResetting(true);
      
      console.log('🔍 Attempting password reset...');
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Password reset failed');
      }
      
      console.log('✅ Password reset email sent successfully');
      setResetSuccess(true);
      setResetEmail('');
      setShowResetForm(false);
    } catch (error) {
      console.log('❌ Password reset error:', error);
      if (error instanceof z.ZodError) {
        setError(error.errors[0].message);
      } else if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsResetting(false);
    }
  };

  const handleOAuthSignIn = async (provider: string) => {
    console.log('🔍 OAuth signin triggered:', { provider });
    setError(null);
    
    try {
      // Use NextAuth signIn function with redirect: false
      const { signIn } = await import('next-auth/react');
      
      console.log('🔍 Calling NextAuth signIn...');
      const result = await signIn(provider, {
        redirect: false,
        callbackUrl: '/'
      });
      
      console.log('🔍 OAuth signIn result:', result);
      
      if (result?.error) {
        console.log('❌ OAuth signin error:', result.error);
        setError('OAuth sign-in failed: ' + result.error);
      } else if (result?.ok) {
        console.log('✅ OAuth signin successful, closing modal');
        closeModal();
        router.refresh(); // Refresh to update session state
      } else {
        console.log('❌ OAuth signin failed with unknown result');
        setError('OAuth sign-in failed');
      }
    } catch (error) {
      console.log('❌ OAuth signin exception:', error);
      setError(error instanceof Error ? error.message : 'OAuth sign-in failed');
    }
  };

  const handleMetaMaskConnect = async () => {
    console.log('🔍 MetaMask connect triggered');
    setError(null);
    
    try {
      await connectWallet('metamask');
      console.log('✅ MetaMask connection successful, closing modal');
      closeModal();
    } catch (error) {
      console.log('❌ MetaMask connection error:', error);
      setError(error instanceof Error ? error.message : 'MetaMask connection failed');
    }
  };

  // Show final error from any source
  const displayError = error || authError;
  const isLoading = isAuthLoading || isResetting || isWalletConnecting;

  return (
    <div className="w-full max-w-md space-y-6">
      <Tabs
        defaultValue="login"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Login</TabsTrigger>
          <TabsTrigger value="signup">Sign Up</TabsTrigger>
        </TabsList>
        

        {displayError && (
          <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-md text-sm mt-4">
            {displayError}
          </div>
        )}
        
        {signupSuccess && (
          <div className="bg-green-50 text-green-700 px-4 py-3 rounded-md text-sm mt-4">
            ✅ Account created successfully! Please log in with your credentials.
          </div>
        )}
        
        {resetSuccess && (
          <div className="bg-green-50 text-green-700 px-4 py-3 rounded-md text-sm mt-4">
            ✅ Password reset email sent! Please check your inbox for instructions.
          </div>
        )}
        
        
        <TabsContent value="login" className="mt-4">
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  onClick={() => setShowResetForm(true)}
                  className="text-sm text-primary hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isAuthLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </TabsContent>
        
        <TabsContent value="signup" className="mt-4">
          <form onSubmit={handleSignupSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="username"
                value={signupUsername}
                onChange={(e) => setSignupUsername(e.target.value)}
                required
                minLength={3}
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email-signup">Email</Label>
              <Input
                id="email-signup"
                type="email"
                placeholder="name@example.com"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password-signup">Password</Label>
              <Input
                id="password-signup"
                type="password"
                placeholder="••••••••"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                required
                minLength={8}
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="••••••••"
                value={signupConfirmPassword}
                onChange={(e) => setSignupConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isAuthLoading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>
        </TabsContent>
        
        {showResetForm && (
          <div className="mt-4 p-4 border rounded-md bg-muted/50">
            <h3 className="text-lg font-medium mb-4">Reset Password</h3>
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-reset">Email</Label>
                <Input
                  id="email-reset"
                  type="email"
                  placeholder="name@example.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              
              <div className="flex gap-2">
                <Button type="submit" disabled={isLoading}>
                  {isResetting ? 'Sending...' : 'Send Reset Email'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowResetForm(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}
      </Tabs>
      
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">or continue with</span>
        </div>
      </div>
      
      <div className="space-y-3">
        {/* Horizontal layout for 2 authentication options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            variant="outline"
            type="button"
            onClick={() => handleOAuthSignIn('google')}
            disabled={isLoading}
            className="h-12 flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 border-red-200 text-red-900"
          >
            <svg className="w-5 h-5" aria-hidden="true" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span className="font-medium text-sm">Google</span>
          </Button>

          <Button
            variant="outline"
            type="button"
            onClick={() => handleMetaMaskConnect()}
            disabled={isLoading}
            className="h-12 flex items-center justify-center gap-2 bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-900"
          >
            <img
              src="/icons/logos/MetaMask-icon-fox.svg"
              alt="MetaMask"
              className="w-5 h-5"
            />
            <span className="font-medium text-sm">MetaMask</span>
          </Button>
        </div>
      </div>
      
      <div className="text-center text-sm">
        {activeTab === 'login' ? (
          <span>
            Don't have an account?{' '}
            <button 
              onClick={() => setActiveTab('signup')}
              className="text-primary hover:underline cursor-pointer"
            >
              Sign up
            </button>
          </span>
        ) : (
          <span>
            Already have an account?{' '}
            <button 
              onClick={() => setActiveTab('login')} 
              className="text-primary hover:underline cursor-pointer"
            >
              Sign in
            </button>
          </span>
        )}
      </div>
    </div>
  );
}






