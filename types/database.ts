// src/types/auth.ts

// =========================================================
// Simple Role Definition
// =========================================================

export const WRITER_ROLE = 'WRITER' as const;

// Get role ID from environment variable
export const getWriterRoleId = () => {
  const roleId = process.env.NEXT_PUBLIC_ROLE_LORE_CREATOR_ID;
  if (!roleId) {
    throw new Error('NEXT_PUBLIC_ROLE_LORE_CREATOR_ID environment variable is not set');
  }
  return roleId;
};

export type UserRole = typeof WRITER_ROLE;

// =========================================================
// User Types
// =========================================================

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  avatar?: string;
  blacklisted: boolean;
  createdAt: string;
  lastLogin: string;
  status?: "active" | "invited" | "draft" | "suspended" | "deleted";
  provider?: string;
  externalIdentifier?: string;
}

// =========================================================
// Authentication Types
// =========================================================

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthTokens {
  access_token: string;
  expires: number;
  refresh_token: string;
}

export interface AuthResponse {
  data?: AuthTokens;
}

// =========================================================
// Registration Types
// =========================================================

export interface SignupData {
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  role: string; // Will be from getWriterRoleId()
  status?: "active" | "invited" | "draft" | "suspended";
  external_identifier?: string;
  provider?: string;
}

// =========================================================
// Session & State Types
// =========================================================

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserProfile | null;
  tokens: AuthTokens | null;
  error: string | null;
}

// =========================================================
// API Error Types
// =========================================================

export interface ApiError {
  message: string;
  extensions?: {
    code?: string;
    [key: string]: any;
  }
}

export interface ValidationError {
  field: string;
  message: string;
}

// =========================================================
// Auth Context
// =========================================================

export interface AuthContext {
  token: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  role: UserRole;
}

export interface Token {
  id: string
  name: string
  symbol: string
  address: string
  description: string
  story: string
  image_url: string
  created_at: string
  created_by: string
  creator_type: "Owner" | "Community"
  telegram: string | null
  email: string | null
  twitter: string | null
  dexscreener: string | null
  featured: boolean
  status: "pending" | "approved" | "rejected"
  good_lores: number
}

export interface TokenSubmission extends Omit<Token, "id" | "created_at" | "good_lores"> {
  id?: string
  created_at?: string
  good_lores?: number
}


// Page types
export interface PageBlock {
  id: string;
  collection?: string;
  item?: string;
  status?: string;
  blocks?: any[];
}

// Post type
export interface Post {
  id: string;
  title: string;
  content?: string;
  slug?: string;
  status?: string;
  image?: DirectusFile | string | null;
  author?: DirectusUser | string | null;
  published_at?: string;
  description?: string;
}

// User type
export interface DirectusUser {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  password?: string;
  avatar?: DirectusFile | string | null;
  role?: string;
  status?: 'active' | 'invited' | 'draft' | 'suspended' | 'deleted';
  profile?: any;
}

// Form field types
export interface FormField {
  id: string;
  name: string;
  type: string;
  label?: string;
  required?: boolean;
  placeholder?: string;
  help?: string;
  options?: any;
}

export type FormFieldType = 'text' | 'textarea' | 'email' | 'number' | 'select' | 'checkbox' | 'radio' | 'date' | 'file';

// Directus file type
export interface DirectusFile {
  id: string;
  storage?: string;
  filename_disk?: string;
  filename_download?: string;
  title?: string;
  type?: string;
  folder?: string | null;
  uploaded_by?: string;
  uploaded_on?: string;
  modified_by?: string | null;
  modified_on?: string;
  filesize?: number;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  description?: string | null;
  location?: string | null;
  tags?: string[] | null;
  metadata?: Record<string, unknown> | null;
}

// Schema type for zod schema builders
export interface Schema {
  collection?: string;
  fields?: any[];
  relations?: any[];
}

export interface DirectusForm {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
  status?: string;
  created_by?: DirectusUser | string | null;
  created_on?: string;
  updated_by?: DirectusUser | string | null;
  updated_on?: string;
}




// Supabase database types
export type Database = {
  public: {
    Tables: {
      tokens: {
        Row: Token
        Insert: TokenSubmission
        Update: Partial<TokenSubmission>
      }
    }
    Functions: {
      create_tokens_table: {
        Args: Record<string, never>
        Returns: void
      }
      exec_sql: {
        Args: { sql: string }
        Returns: void
      }
    }
  }
}
