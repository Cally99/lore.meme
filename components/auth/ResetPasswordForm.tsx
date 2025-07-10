'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { z } from 'zod';

const resetSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

interface ResetPasswordFormProps {
  onBack: () => void;
  onReset: (email: string) => Promise<void>;
}

export function ResetPasswordForm({ onBack, onReset }: ResetPasswordFormProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      resetSchema.parse({ email });
      setError(null);
      setIsResetting(true);
      
      await onReset(email);
      
      setResetSuccess(true);
      setEmail('');
    } catch (error) {
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

  if (resetSuccess) {
    return (
      <div className="mt-4 p-4 border rounded-md bg-muted/50">
        <h3 className="text-lg font-medium mb-4">Reset Password</h3>
        <div className="space-y-4">
          <div className="bg-green-50 text-green-700 px-4 py-3 rounded-md text-sm">
            ✅ Password reset email sent! Please check your inbox for instructions.
          </div>
          <Button onClick={onBack} className="w-full">
            Back to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 p-4 border rounded-md bg-muted/50">
      <h3 className="text-lg font-medium mb-4">Reset Password</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email-reset">Email</Label>
          <Input
            id="email-reset"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isResetting}
          />
        </div>
        
        {error && (
          <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}
        
        <div className="flex gap-2">
          <Button type="submit" disabled={isResetting}>
            {isResetting ? 'Sending...' : 'Send Reset Email'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={isResetting}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}