import { describe, it, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthForm } from '@/components/auth/AuthForm';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import { checkEmailExists } from '@/lib/api/auth/checkEmail';
import { signUpWithEmail } from '@/lib/api/auth/signup';
import { signInWithEmail } from '@/lib/api/auth/signin';

// Mock the API functions
vi.mock('@/lib/api/auth/checkEmail');
vi.mock('@/lib/api/auth/signup');
vi.mock('@/lib/api/auth/signin');

const renderWithProvider = (ui: React.ReactNode) => {
  return render(
    <AuthProvider>
      {ui}
      <Toaster />
    </AuthProvider>
  );
};

describe('AuthForm', () => {
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show toast when email already exists during signup', async () => {
    // Mock email exists response
    (checkEmailExists as any).mockResolvedValue({
      exists: true,
      message: 'An account with this email already exists. Please login.'
    });

    renderWithProvider(
      <AuthForm onSuccess={mockOnSuccess} defaultMode="signup" />
    );

    // Fill in signup form
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'existing@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' }
    });
    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'testuser' }
    });

    // Wait for validation to complete
    await waitFor(() => {
      expect(screen.getByText(/An account with this email already exists/i)).toBeInTheDocument();
    });

    // Verify signup button is disabled
    const signupButton = screen.getByRole('button', { name: /create account/i });
    expect(signupButton).toBeDisabled();

    // Verify toast appears with login link
    const loginLink = screen.getByText(/login/i);
    expect(loginLink).toBeInTheDocument();
  });

  it('should allow signup when email does not exist', async () => {
    // Mock email does not exist
    (checkEmailExists as any).mockResolvedValue({ exists: false });

    // Mock successful signup
    (signUpWithEmail as any).mockResolvedValue({ success: true });

    renderWithProvider(
      <AuthForm onSuccess={mockOnSuccess} defaultMode="signup" />
    );

    // Fill in signup form
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'newuser@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' }
    });
    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: 'newuser' }
    });

    // Wait for validation
    await waitFor(() => {
      expect(checkEmailExists).toHaveBeenCalledWith('newuser@example.com');
    });

    // Submit form
    const signupButton = screen.getByRole('button', { name: /create account/i });
    fireEvent.click(signupButton);

    // Verify signup was called
    await waitFor(() => {
      expect(signUpWithEmail).toHaveBeenCalledWith(
        'newuser@example.com',
        'password123',
        'newuser'
      );
    });

    // Verify success callback was called
    expect(mockOnSuccess).toHaveBeenCalled();
  });

  it('should switch to login tab when login link is clicked in toast', async () => {
    // Mock email exists
    (checkEmailExists as any).mockResolvedValue({
      exists: true,
      message: 'An account with this email already exists. Please login.'
    });

    renderWithProvider(
      <AuthForm onSuccess={mockOnSuccess} defaultMode="signup" />
    );

    // Fill in email that exists
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'existing@example.com' }
    });

    // Wait for toast
    await waitFor(() => {
      expect(screen.getByText(/login/i)).toBeInTheDocument();
    });

    // Click login link
    const loginLink = screen.getByText(/login/i);
    fireEvent.click(loginLink);

    // Verify we're now on login tab
    expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
  });
});