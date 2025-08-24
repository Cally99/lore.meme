// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { useAuthApi } from '@/lib/hooks/useAuthApi';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSession } from 'next-auth/react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Icons } from '@/components/ui/icons';
import { useAccount, useSignMessage } from 'wagmi';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getErrorMessage } from '@/lib/auth/error-codes';
import { signUpAndSignIn } from '@/lib/api/auth/signup-and-signin';

// Form validation schemas
const loginSchema = z.object({
  identifier: z.string().min(1, 'Email is required'),
  password: z.string().min(1, 'Password is required'),
});

const signupSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be 20 characters or less')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;
type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

interface AuthFormProps {
  onSuccess?: () => void;
  onClose?: () => void; // Add this line
  defaultTab?: 'login' | 'signup';
}

export function AuthForm({ onSuccess, onClose, defaultTab = 'login' }: AuthFormProps) {
  // Ensure onClose is called after successful authentication
  const {
    signInWithEmail,
    signUpWithEmail,
    signInWithProvider,
    signInWithWallet,
    getWalletNonce,
    isLoading,
    error,
    clearErrors
  } = useAuthApi();
  const { update } = useSession();

  const [activeTab, setActiveTab] = useState(defaultTab);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [autoSwitchEmail, setAutoSwitchEmail] = useState<string | null>(null);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailExists, setEmailExists] = useState<boolean | null>(null);
  const [emailCheckTimeout, setEmailCheckTimeout] = useState<NodeJS.Timeout | null>(null);

  // Wallet connection
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  // Form setup
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: '',
      password: '',
    },
  });

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const forgotPasswordForm = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  // Clear errors when tab changes
  useEffect(() => {
    clearErrors();
    setWalletError(null);
    loginForm.clearErrors();
    signupForm.clearErrors();
    forgotPasswordForm.clearErrors();
  }, [activeTab, clearErrors, loginForm, signupForm, forgotPasswordForm]);

  // Handle wallet connection changes
  useEffect(() => {
    if (isConnected && address && activeTab === 'login') {
      handleWalletSignIn();
    }
  }, [isConnected, address, activeTab]);

  const handleLogin = async (data: LoginFormData) => {
    try {
      clearErrors();
      await signInWithEmail(data.identifier, data.password);
      onSuccess?.();
      if (onClose) {
        onClose();
      }
    } catch (error) {
      // Error is already handled by useAuthApi hook
      console.error('Login error:', error);
    }
  };

  const handleSignup = async (data: SignupFormData) => {
    try {
      clearErrors();
      // Prevent signup if email already exists
      if (emailExists === true) {
        return;
      }
      const result = await signUpAndSignIn(data.email, data.password, data.username);
      if (result.success) {
        // Force a session refresh
        await update();
        onSuccess?.();
        if (onClose) {
          onClose();
        }
      }
    } catch (error) {
      // Error is already handled by useAuthApi hook
      console.error('Signup error:', error);

      // Preserve form state on error
      signupForm.setValue('email', data.email);
      signupForm.setValue('username', data.username);
      signupForm.setValue('password', data.password);
      signupForm.setValue('confirmPassword', data.confirmPassword);

      // Check if it's a duplicate email error and auto-switch to login
      if (error && typeof error === 'object' && 'code' in error && error.code === 'AUTH_DUPLICATE_EMAIL') {
        // Store the email for auto-switch
        setAutoSwitchEmail(data.email);
        // Auto-switch to login tab after a brief delay
        setTimeout(() => {
          setActiveTab('login');
        }, 2000);
      }
    }
  };

  const handleForgotPassword = async (data: ForgotPasswordFormData) => {
    try {
      clearErrors();
      console.log('🔍 [FORGOT PASSWORD] Starting password reset request for:', data.email);

      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email.toLowerCase(),
        }),
      });

      const result = await response.json();
      console.log('🔍 [FORGOT PASSWORD] API response:', response.status, result);

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send password reset email');
      }

      console.log('✅ [FORGOT PASSWORD] Password reset email sent successfully');

      // Show success message - always show success to prevent email enumeration
      alert('If an account with that email exists, password reset instructions have been sent to your email.');
      setShowForgotPassword(false);

      // Reset the form
      forgotPasswordForm.reset();

    } catch (error) {
      console.error('❌ [FORGOT PASSWORD] Error:', error);

      // Even on error, show the same success message for security
      // This prevents email enumeration attacks
      alert('If an account with that email exists, password reset instructions have been sent to your email.');
      setShowForgotPassword(false);
    }
  };

  const handleOAuthSignIn = async (provider: 'google' | 'github') => {
    try {
      clearErrors();
      await signInWithProvider(provider);
      onSuccess?.();
    } catch (error) {
      // Error is already handled by useAuthApi hook
      console.error('OAuth error:', error);
    }
  };

  const handleWalletSignIn = async () => {
    if (!address || isConnectingWallet) return;

    setIsConnectingWallet(true);
    setWalletError(null);

    try {
      const nonce = await getWalletNonce(address);
      const message = `Welcome to Lore Machine!\n\nPlease sign this message to verify your wallet ownership.\n\nNonce: ${nonce}`;

      const signature = await signMessageAsync({ message });

      await signInWithWallet(address, signature, message);
      onSuccess?.();
      onClose?.();
    } catch (error) {
      const errorMessage = getErrorMessage(error instanceof Error ? error.message : 'Wallet authentication failed');
      setWalletError(errorMessage);
      // Preserve form state on error
      if (activeTab === 'login') {
        loginForm.setValue('identifier', loginForm.getValues('identifier'));
        loginForm.setValue('password', loginForm.getValues('password'));
      }
      console.error('Wallet authentication error:', error);
    } finally {
      setIsConnectingWallet(false);
    }
  };

  const handleWalletButtonClick = () => {
    if (!isConnected) {
      // This will trigger the wallet connection flow
      // The actual sign-in happens in the useEffect above
      return;
    }
    handleWalletSignIn();
  };

  // Effect to pre-fill email when auto-switching
  useEffect(() => {
    if (activeTab === 'login' && autoSwitchEmail) {
      loginForm.setValue('identifier', autoSwitchEmail);
      setAutoSwitchEmail(null);
    }
  }, [activeTab, autoSwitchEmail, loginForm]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (emailCheckTimeout) {
        clearTimeout(emailCheckTimeout);
      }
    };
  }, [emailCheckTimeout]);

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'login' | 'signup')}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="login">Login</TabsTrigger>
          <TabsTrigger value="signup">Sign Up</TabsTrigger>
        </TabsList>

        <TabsContent value="login" className="space-y-6">
          {(error || walletError) && (
            <Alert variant="destructive">
              <AlertDescription>
                {error?.message || walletError || 'Invalid username or password. Please try again.'}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email" className="text-white">Email</Label>
              <Input
                id="login-email"
                type="email"
                placeholder="name@example.com"
                {...loginForm.register('identifier')}
                disabled={isLoading}
                className="bg-[#1a1f2e] border-[#2a3441] text-white placeholder:text-gray-400"
              />
              {loginForm.formState.errors.identifier && (
                <p className="text-sm text-red-400">{loginForm.formState.errors.identifier.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="login-password" className="text-white">Password</Label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-blue-400 hover:underline"
                  disabled={isLoading}
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showLoginPassword ? "text" : "password"}
                  placeholder="••••••••"
                  {...loginForm.register('password')}
                  disabled={isLoading}
                  className="bg-[#1a1f2e] border-[#2a3441] text-white placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3 top-1/2 h-6 w-6 -translate-y-1/2 text-gray-400 hover:text-white"
                  aria-label={showLoginPassword ? "Hide password" : "Show password"}
                >
                  <Icons.eye className={`h-6 w-6 ${showLoginPassword ? 'hidden' : 'block'}`} />
                  <Icons.eyeOff className={`h-6 w-6 ${showLoginPassword ? 'block' : 'hidden'}`} />
                </button>
              </div>
              {loginForm.formState.errors.password && (
                <p className="text-sm text-red-400">{loginForm.formState.errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-lg font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-600" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#0d1117] px-2 text-gray-400">OR CONTINUE WITH</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
              onClick={handleWalletButtonClick}
              disabled={isLoading || isConnectingWallet}
              className="h-12 flex items-center justify-center gap-2 bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-900"
            >
              {isConnectingWallet ? (
                <>
                  <Icons.spinner className="w-5 h-5 animate-spin" />
                  <span className="font-medium text-sm">Connecting...</span>
                </>
              ) : (
                <>
                  <img
                    src="/icons/logos/MetaMask-icon-fox.svg"
                    alt="MetaMask"
                    className="w-5 h-5"
                  />
                  <span className="font-medium text-sm">MetaMask</span>
                </>
              )}
            </Button>
          </div>

          <div className="text-center text-sm text-gray-400">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => setActiveTab('signup')}
              className="text-blue-400 hover:underline"
            >
              Sign up
            </button>
          </div>
        </TabsContent>

        <TabsContent value="signup" className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>
                {error?.message || 'Unable to create account. Please check your information and try again.'}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signup-username" className="text-white">Username</Label>
              <Input
                id="signup-username"
                type="text"
                placeholder="username"
                {...signupForm.register('username')}
                disabled={isLoading}
                className="bg-[#1a1f2e] border-[#2a3441] text-white placeholder:text-gray-400"
              />
              {signupForm.formState.errors.username && (
                <p className="text-sm text-red-400">{signupForm.formState.errors.username.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-email" className="text-white">Email</Label>
              <Input
                id="signup-email"
                type="email"
                placeholder="name@example.com"
                {...signupForm.register('email')}
                disabled={isLoading}
                className="bg-[#1a1f2e] border-[#2a3441] text-white placeholder:text-gray-400"
              />
              {signupForm.formState.errors.email && (
                <p className="text-sm text-red-400">{signupForm.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-password" className="text-white">Password</Label>
              <div className="relative">
                <Input
                  id="signup-password"
                  type={showSignupPassword ? "text" : "password"}
                  placeholder="••••••••"
                  {...signupForm.register('password')}
                  disabled={isLoading}
                  className="bg-[#1a1f2e] border-[#2a3441] text-white placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowSignupPassword(!showSignupPassword)}
                  className="absolute right-3 top-1/2 h-6 w-6 -translate-y-1/2 text-gray-400 hover:text-white"
                  aria-label={showSignupPassword ? "Hide password" : "Show password"}
                >
                  <Icons.eye className={`h-6 w-6 ${showSignupPassword ? 'hidden' : 'block'}`} />
                  <Icons.eyeOff className={`h-6 w-6 ${showSignupPassword ? 'block' : 'hidden'}`} />
                </button>
              </div>
              {signupForm.formState.errors.password && (
                <p className="text-sm text-red-400">{signupForm.formState.errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-confirm-password" className="text-white">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="signup-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  {...signupForm.register('confirmPassword')}
                  disabled={isLoading}
                  className="bg-[#1a1f2e] border-[#2a3441] text-white placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 h-6 w-6 -translate-y-1/2 text-gray-400 hover:text-white"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  <Icons.eye className={`h-6 w-6 ${showConfirmPassword ? 'hidden' : 'block'}`} />
                  <Icons.eyeOff className={`h-6 w-6 ${showConfirmPassword ? 'block' : 'hidden'}`} />
                </button>
              </div>
              {signupForm.formState.errors.confirmPassword && (
                <p className="text-sm text-red-400">{signupForm.formState.errors.confirmPassword.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 rounded-lg font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-600" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
              onClick={handleWalletButtonClick}
              disabled={isLoading || isConnectingWallet}
              className="h-12 flex items-center justify-center gap-2 bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-900"
            >
              {isConnectingWallet ? (
                <>
                  <Icons.spinner className="w-5 h-5 animate-spin" />
                  <span className="font-medium text-sm">Connecting...</span>
                </>
              ) : (
                <>
                  <img
                    src="/icons/logos/MetaMask-icon-fox.svg"
                    alt="MetaMask"
                    className="w-5 h-5"
                  />
                  <span className="font-medium text-sm">MetaMask</span>
                </>
              )}
            </Button>
          </div>

          <div className="text-center text-sm text-gray-400">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => setActiveTab('login')}
              className="text-blue-400 hover:underline"
            >
              Sign in
            </button>
          </div>
        </TabsContent>
      </Tabs>

      {showForgotPassword && (
        <div className="mt-6 p-6 bg-[#1a1f2e] border border-[#2a3441] rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-2">Reset Password</h3>
          <p className="text-sm text-gray-400 mb-4">
            Enter your email address and we'll send you instructions to reset your password.
          </p>

          <form onSubmit={forgotPasswordForm.handleSubmit(handleForgotPassword)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email" className="text-white">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                placeholder="Enter your email"
                {...forgotPasswordForm.register('email')}
                disabled={isLoading}
                className="bg-[#1a1f2e] border-[#2a3441] text-white placeholder:text-gray-400"
              />
              {forgotPasswordForm.formState.errors.email && (
                <p className="text-sm text-red-400">{forgotPasswordForm.formState.errors.email.message}</p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForgotPassword(false)}
                disabled={isLoading}
                className="bg-white/5 border-gray-600 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Reset'
                )}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}