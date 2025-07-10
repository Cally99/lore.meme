// @ts-ignore
// src/lib/api/clients/authClient.ts
import { BaseApiClient } from './baseClient';
import { UserRole } from '@/types/directus/auth';

export interface SignupData {
  username: string;
  email: string;
  password: string;
  role: UserRole;
  sessionId?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface WalletAuthData {
  address: string;
  signature: string;
  message: string;
  role?: UserRole;
}

export interface MagicLinkRequest {
  email: string;
}

export class AuthClient extends BaseApiClient {
  constructor() {
    super('/api/auth');
  }
  
  async signup(data: SignupData) {
    return this.post('/signup', data);
  }
  
  async login(credentials: LoginCredentials) {
    return this.post('/login', credentials);
  }
  
  async walletAuth(data: WalletAuthData) {
    return this.post('/wallet', data);
  }
  
  async sendMagicLink(data: MagicLinkRequest) {
    return this.post('/magic-link', data);
  }
  
  async verifyCivicPass(gatewayToken: string) {
    return this.post('/civic-verify', { gatewayToken });
  }
  
  async sendPasswordReset(email: string) {
    return this.post('/forgot-password', { email });
  }
  
  async resetPassword(token: string, password: string) {
    return this.post('/reset-password', { token, password });
  }
  
  async enable2FA() {
    return this.post('/enable-2fa', {});
  }
  
  async verify2FA(code: string) {
    return this.post('/verify-2fa', { code });
  }
}

// Create a singleton instance
export const authClient = new AuthClient();