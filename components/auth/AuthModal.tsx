'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { AuthForm } from '@/components/auth/AuthForm';
import { useSession } from 'next-auth/react';

interface AuthModalProps {
  onClose?: () => void;
  triggerButtonText?: string;
  triggerButtonVariant?: "link" | "default" | "destructive" | "outline" | "secondary" | "ghost" | null | undefined;
  triggerButtonClassName?: string;
}

export function AuthModal({
  onClose,
  triggerButtonText = "Login / Sign Up",
  triggerButtonVariant = "default",
  triggerButtonClassName
}: AuthModalProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const { data: session, status } = useSession();

  // When used with provider, onClose is provided
  // When used standalone, use internal state
  const isControlledByProvider = !!onClose;
  const isOpen = isControlledByProvider ? true : internalIsOpen;
  const handleOpenChange = isControlledByProvider ?
    (open: boolean) => { if (!open) onClose?.(); } :
    setInternalIsOpen;

  // Don't render the modal trigger if the user is already authenticated and no onClose (provider mode)
  if (status === 'authenticated' && !isControlledByProvider) {
    return null;
  }

  // If controlled by provider, just render the content
  if (isControlledByProvider) {
    return (
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[425px] md:max-w-[480px] bg-background text-foreground p-0">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="text-2xl font-semibold text-center">
              Welcome to lore.meme
            </DialogTitle>
            <DialogDescription className="text-center text-muted-foreground">
              Connect your wallet or use your email to continue.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-6">
            <AuthForm />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Standalone mode with trigger
  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant={triggerButtonVariant} className={triggerButtonClassName}>
          {triggerButtonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] md:max-w-[480px] bg-background text-foreground p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-2xl font-semibold text-center">
            Welcome to lore.meme
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            Connect your wallet or use your email to continue.
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 pb-6">
          <AuthForm />
        </div>
      </DialogContent>
    </Dialog>
  );
}

