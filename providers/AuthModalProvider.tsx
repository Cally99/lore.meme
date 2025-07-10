// src/providers/AuthModalProvider.tsx
'use client';

import { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { AuthModal } from '@/components/auth/AuthModal'; 

interface AuthModalContextType {
  isOpen: boolean;
  isLocked: boolean;
  openModal: () => void;
  closeModal: () => void;
  lockModal: () => void;
  unlockModal: () => void;
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined);

export const AuthModalProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const openModal = useCallback(() => setIsOpen(true), []);
  const closeModal = useCallback(() => {
    if (!isLocked) {
      setIsOpen(false);
    }
  }, [isLocked]);
  
  const lockModal = useCallback(() => setIsLocked(true), []);
  const unlockModal = useCallback(() => setIsLocked(false), []);

  return (
    <AuthModalContext.Provider value={{ isOpen, isLocked, openModal, closeModal, lockModal, unlockModal }}>
      {children}
      {isOpen && <AuthModal onClose={closeModal} />}
    </AuthModalContext.Provider>
  );
};

export const useAuthModal = () => {
  const context = useContext(AuthModalContext);
  if (context === undefined) {
    throw new Error('useAuthModal must be used within an AuthModalProvider');
  }
  return context;
};