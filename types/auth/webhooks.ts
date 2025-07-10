// types/auth/webhooks.ts
export interface DirectusAccountability {
  user?: string;
  role?: string;
  admin?: boolean;
  app?: boolean;
  ip?: string;
  userAgent?: string;
}

export interface UserCreatedWebhook {
  event: 'users.create';
  accountability: DirectusAccountability;
  payload: {
    id: string;
    email: string;
    status: 'active' | 'invited' | 'draft';
    role: string;
    first_name?: string;
    last_name?: string;
    external_identifier?: string;
    provider?: string;
  };
  key: string;
  collection: 'directus_users';
}

export interface UserVerifiedWebhook {
  event: 'users.update';
  accountability: DirectusAccountability;
  payload: {
    id: string;
    email: string;
    status: 'active';
    last_access?: string;
    role?: string;
  };
  keys: string[];
  collection: 'directus_users';
}

export interface AuthSuccessWebhook {
  event: 'auth.login';
  accountability: DirectusAccountability;
  payload: {
    user: string;
    provider: 'local' | 'oauth';
    ip: string;
    user_agent?: string;
  };
  key: string;
  collection: 'directus_activity';
}

export interface WebhookSecurityHeaders {
  'x-directus-signature'?: string;
  'x-directus-timestamp'?: string;
  'authorization'?: string;
}

export interface WebhookValidationResult {
  isValid: boolean;
  error?: string;
  payload?: any;
}