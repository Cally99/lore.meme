// src/components/profile/SecuritySettings.tsx
'use client';

import { useState } from 'react';
import { User } from 'next-auth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { z } from 'zod';

interface SecuritySettingsProps {
  user: User;
}

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export function SecuritySettings({ user }: SecuritySettingsProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate form
      changePasswordSchema.parse({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      
      setError(null);
      setIsLoading(true);
      
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to change password');
      }
      
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsChangingPassword(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setIsChangingPassword(false);
    setError(null);
  };

  const isWalletUser = (user as any).walletAddress;

  return (
    <div className="space-y-6 max-w-md">
      {success && (
        <div className="bg-green-50 text-green-700 px-4 py-3 rounded-md text-sm">
          ✅ Password changed successfully!
        </div>
      )}
      
      {error && (
        <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium mb-2">Account Security</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 border rounded-md">
              <div>
                <p className="font-medium">Password</p>
                <p className="text-sm text-muted-foreground">
                  {isWalletUser ? 'Not applicable for wallet accounts' : 'Change your account password'}
                </p>
              </div>
              {!isWalletUser && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsChangingPassword(true)}
                  disabled={isChangingPassword}
                >
                  Change
                </Button>
              )}
            </div>

            <div className="flex justify-between items-center p-3 border rounded-md">
              <div>
                <p className="font-medium">Two-Factor Authentication</p>
                <p className="text-sm text-muted-foreground">
                  Add an extra layer of security (Coming soon)
                </p>
              </div>
              <Button variant="outline" size="sm" disabled>
                Enable
              </Button>
            </div>
          </div>
        </div>

        {isChangingPassword && !isWalletUser && (
          <div className="border rounded-md p-4 space-y-4">
            <h4 className="font-medium">Change Password</h4>
            <form onSubmit={handleChangePassword} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isLoading}
                  minLength={8}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Changing...' : 'Change Password'}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel} disabled={isLoading}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        <div>
          <h3 className="text-lg font-medium mb-2">Login Activity</h3>
          <div className="space-y-2">
            <div className="p-3 border rounded-md">
              <p className="font-medium">Current Session</p>
              <p className="text-sm text-muted-foreground">
                Active now • {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}