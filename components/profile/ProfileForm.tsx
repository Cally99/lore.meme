// src/components/profile/ProfileForm.tsx
'use client';

import { useState } from 'react';
import { User } from 'next-auth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAuthApi } from '@/lib/hooks/useAuthApi';

interface ProfileFormProps {
  user: User;
}

export function ProfileForm({ user }: ProfileFormProps) {
  const [firstName, setFirstName] = useState(user.name || '');
  const [email, setEmail] = useState(user.email || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { updateProfile } = useAuthApi();

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      
      await updateProfile({
        first_name: firstName,
      });
      
      setSuccess(true);
      setIsEditing(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFirstName(user.name || '');
    setIsEditing(false);
    setError(null);
  };

  return (
    <div className="space-y-6 max-w-md">
      {success && (
        <div className="bg-green-50 text-green-700 px-4 py-3 rounded-md text-sm">
          ✅ Profile updated successfully!
        </div>
      )}
      
      {error && (
        <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">Display Name</Label>
          <Input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            disabled={!isEditing || isSaving}
            placeholder="Enter your display name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            value={email}
            disabled={true}
            className="bg-muted"
          />
          <p className="text-xs text-muted-foreground">
            Email cannot be changed. Contact support if you need to update your email.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Account Role</Label>
          <div className="px-3 py-2 bg-muted rounded-md text-sm">
            {user.role || 'User'}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Authentication Method</Label>
          <div className="px-3 py-2 bg-muted rounded-md text-sm">
            {(user as any).walletAddress ? 'Wallet' : 'Email/Password'}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)}>
            Edit Profile
          </Button>
        ) : (
          <>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
              Cancel
            </Button>
          </>
        )}
      </div>
    </div>
  );
}