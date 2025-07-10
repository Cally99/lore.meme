// src/types/auth.ts
import { Components as components, Operations as operations } from '@/types/directus/api-collection';

// =========================================================
// Core Role Definitions
// =========================================================

export enum UserRole {
  APPLICANT = 'applicant',
  EMPLOYER_ADMIN = 'employer_admin',
  TEAM_MEMBER = 'team_member',
  ADMIN = 'admin'
}

// Map between UserRole enum and Directus role IDs
export interface RoleMapping {
  [UserRole.APPLICANT]: string;
  [UserRole.EMPLOYER_ADMIN]: string;
  [UserRole.TEAM_MEMBER]: string;
  [UserRole.ADMIN]: string;
}

// =========================================================
// User & Profile Types
// =========================================================

// Base user type from Directus schema
export type DirectusUser = components["schemas"]["Users"];

// Base user profile from Directus schema
export type DirectusUserProfile = components["schemas"]["ItemsUserProfiles"];

// Enhanced user profile that merges your custom fields with Directus
export interface UserProfile {
  // Core identity fields
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  
  // Verification and security
  avatar?: string;
  civicPassVerified?: boolean;
  blacklisted: boolean;
  loginAttempts: number;
  
  // Timestamps
  createdAt: string;
  lastLogin: string;
  
  // Associated entities
  employerId?: string; // For team members
  walletAddress?: string;
  
  // Tracking
  ipAddress?: string;
  
  // Directus-specific fields
  status?: "active" | "invited" | "draft" | "suspended" | "deleted";
  provider?: string;
  externalIdentifier?: string | null;
}

// Expanded user profile with role details
export interface UserProfileWithRole extends UserProfile {
  roleDetails: components["schemas"]["Roles"];
}

// =========================================================
// Authentication Types
// =========================================================

// Login request types
export interface LoginCredentials {
  email: string;
  password: string;
  otp?: string; // For 2FA
  mode?: "json" | "cookie" | "session";
}

// Authentication response types
export interface AuthTokens {
  access_token: string;
  expires: number;
  refresh_token: string;
}

export interface AuthResponse {
  data?: AuthTokens;
}

// Token refresh types
export interface RefreshTokenRequest {
  refresh_token?: string;
  mode?: "json" | "cookie" | "session";
}

// Logout request
export interface LogoutRequest {
  refresh_token?: string;
  mode?: "json" | "cookie" | "session";
}

// 2FA authentication types
export interface TwoFactorSetupResponse {
  data?: {
    secret: string;
    otpauth_url: string;
  }
}

export interface TwoFactorVerifyRequest {
  otp: string;
}

// =========================================================
// Registration & User Creation Types
// =========================================================

// Signup data (extended from your original)
export interface SignupData {
  email: string;
  username: string;
  password: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  walletAddress?: string;
  company?: string; // For employer signup
}

// Mapped to Directus user creation
export interface CreateUserPayload {
  // Core Directus user fields
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  role: string; // Directus role ID
  status?: "active" | "invited" | "draft" | "suspended";
  
  // Profile fields through profile relation
  profile?: Omit<DirectusUserProfile, "id" | "user"> & {
    civicVerificationStatus?: string;
    full_name?: string;
    walletAddress?: string;
    company?: string;
  };
}

// User profile update payload
export type UpdateUserProfilePayload = Partial<Omit<UserProfile, 'id' | 'email' | 'role' | 'createdAt'>>;

// =========================================================
// Invitations & Team Management
// =========================================================

// Team member invitation
export interface TeamMemberInvite {
  email: string;
  role: UserRole.TEAM_MEMBER;
  permissions: string[];
  employerId: string;
}

// Maps to Directus invitation
export interface DirectusInvitePayload {
  email: string | string[];
  role?: string;
  invite_url?: string;
  subject?: string;
}

// Invitation acceptance
export interface AcceptInvitePayload {
  token: string;
  password: string;
}

// =========================================================
// Password Management
// =========================================================

export interface RequestPasswordResetPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
}

// =========================================================
// Wallet Authentication
// =========================================================

export interface WalletAuthData {
  address: string;
  signature: string;
  message: string;
}

export interface WalletAuthVerifyPayload {
  address: string;
  signature: string;
  message: string;
}

export interface WalletLinkRequest {
  userId: string;
  walletAddress: string;
}

// =========================================================
// Role & Permission Types
// =========================================================

// Role definition
// Changed from 'extends' to an intersection type '&'
// Assuming components["schemas"]["Roles"] provides most base fields.
// Add or override fields as necessary.
export type Role = components["schemas"]["Roles"] & {
  // If 'name' is optional in components["schemas"]["Roles"] but required here:
  name: string;
  // Add any custom fields not in components["schemas"]["Roles"] or to override types:
  // description?: string; // Example: if you want to ensure it's string or override
  // icon?: string;
  // enforce_tfa?: boolean;
  // external_id?: string;
  permissions?: Permission[]; // Assuming Permission type is defined elsewhere
  users?: DirectusUser[];   // Assuming DirectusUser type is defined elsewhere
};

// Permission definition
// Assuming components["schemas"]["Permissions"] provides most base fields.
// Add or override fields as necessary.
export type Permission = components["schemas"]["Permissions"] & {
  // If 'id' is optional in components["schemas"]["Permissions"] but required here,
  // or if you need to ensure its type:
  id?: number;
  role?: string | Role; // Assuming Role type is defined above
  collection?: string;
  action?: "create" | "read" | "update" | "delete";
  // These fields might already be in components["schemas"]["Permissions"]
  // If so, you only need to include them here if you are changing their type (e.g., making optional required)
  // or adding them if they are custom.
  permissions?: Record<string, unknown> | null;
  validation?: Record<string, unknown> | null;
  presets?: Record<string, unknown> | null;
  fields?: string[] | null;
};

// User permission check
export interface PermissionCheck {
  collection: string;
  action: "create" | "read" | "update" | "delete";
  fields?: string[];
}

// Permission mapping for team roles
export interface TeamPermissions {
  canManageTeam: boolean;
  canPostJobs: boolean;
  canEditJobs: boolean;
  canViewApplications: boolean;
  canMessageCandidates: boolean;
  canManageCompanyProfile: boolean;
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
// API Operation Types
// =========================================================

// Login operation
export type LoginOperation = operations["login"];
export type LoginRequest = LoginOperation["requestBody"]["content"]["application/json"];
export type LoginSuccessResponse = LoginOperation["responses"]["200"]["content"]["application/json"];

// Current user operation
export type GetMeOperation = operations["getMe"];
export type GetMeResponse = GetMeOperation["responses"]["200"]["content"]["application/json"];

// User creation operation
export type CreateUserOperation = operations["createUser"];
export type CreateUserRequest = CreateUserOperation["requestBody"]["content"]["application/json"];
export type CreateUserResponse = CreateUserOperation["responses"]["200"]["content"]["application/json"];

// =========================================================
// Utility Types
// =========================================================

// API Error types
export interface ApiError {
  message: string;
  extensions?: {
    code?: string;
    [key: string]: any;
  }
}

// Validation error
export interface ValidationError {
  field: string;
  message: string;
}

// Auth middleware context
export interface AuthContext {
  token: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  role: UserRole | null;
  permissions: Permission[];
}
