// @ts-ignore
// src/app/api/auth/[...nextauth]/route.ts
import NextAuth, { type NextAuthConfig } from "next-auth";
import GoogleProvider from 'next-auth/providers/google';
import GithubProvider from 'next-auth/providers/github';
import CredentialsProvider from 'next-auth/providers/credentials';
import { authLogger } from '@/lib/monitoring/logger';

// Session storage utilities for wallet sessions
interface WalletSession {
  id: string;
  walletAddress: string;
  chainId: number;
  issuedAt: number;
  expiresAt: number;
  lastActivity: number;
  token: string;
  verified: boolean;
}

const WALLET_SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

// Note: These functions would typically be used on the client side
// but we include them here for reference and potential server-side session validation
const getStoredWalletSession = (address: string): WalletSession | null => {
  // This would be implemented on the client side using localStorage
  // Server-side implementation would use a different storage mechanism
  return null;
};

const extendSession = (session: WalletSession) => {
  session.lastActivity = Date.now();
  session.expiresAt = Date.now() + WALLET_SESSION_DURATION;
  // Store updated session (implementation depends on storage mechanism)
};

// Validate required environment variables
function validateOAuthCredentials() {
  const errors: string[] = [];
  
  if (!process.env.GOOGLE_CLIENT_ID) {
    errors.push('GOOGLE_CLIENT_ID is required');
  }
  if (!process.env.GOOGLE_CLIENT_SECRET) {
    errors.push('GOOGLE_CLIENT_SECRET is required');
  }
  
  // Enhanced logging for debugging OAuth issues
  console.log('🔍 OAuth Credentials Debug:');
  console.log('- Client ID:', process.env.GOOGLE_CLIENT_ID ? `${process.env.GOOGLE_CLIENT_ID.substring(0, 20)}...` : 'MISSING');
  console.log('- Client Secret:', process.env.GOOGLE_CLIENT_SECRET ? `${process.env.GOOGLE_CLIENT_SECRET.substring(0, 15)}...` : 'MISSING');
  console.log('- NextAuth URL:', process.env.NEXTAUTH_URL);
  console.log('- Expected Callback:', `${process.env.NEXTAUTH_URL}/api/auth/callback/google`);
  console.log('- Lore Creator Role ID:', process.env.NEXT_PUBLIC_ROLE_LORE_CREATOR_ID);
  
  if (errors.length > 0) {
    authLogger.error('OAuth configuration errors', new Error(errors.join(', ')));
    console.error('❌ OAuth Configuration Errors:', errors);
  }
  
  return errors.length === 0;
}

// Enhanced user lookup with webhook cache fallback
async function findUserByEmail(email: string) {
  try {
    console.log('🔍 Finding user by email:', email);
    
    // First check webhook cache for recently created users
    try {
      const { userCache } = await import('@/app/api/webhooks/directus/route');
      const cachedUser = userCache.get(email.toLowerCase());
      if (cachedUser) {
        console.log('✅ Found user in webhook cache:', { id: cachedUser.userId, email: cachedUser.email });
        // Return a user object that matches the expected format
        return {
          id: cachedUser.userId,
          email: cachedUser.email,
          role: process.env.NEXT_PUBLIC_ROLE_LORE_CREATOR_ID,
          status: 'active'
        };
      }
    } catch (error) {
      console.log('⚠️ Webhook cache not available, falling back to API');
    }
    
    // Fallback to API lookup - Only query fields that exist
    const url = `${process.env.NEXT_PUBLIC_DIRECTUS_URL}/users?filter[email][_eq]=${encodeURIComponent(email.toLowerCase())}&fields=id,email,role,status,first_name,last_name,last_access`;
    console.log('🔍 [FIND USER] User lookup URL:', url);
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.ADMIN_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log('🔍 User lookup response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('🔍 Total users found:', data.data ? data.data.length : 0);
      console.log('🔍 User lookup response data:', JSON.stringify(data, null, 2));
      
      if (data.data && data.data.length > 0) {
        const user = data.data[0]; // Should only be one user with this email
        
        console.log('✅ Found user via API lookup:', {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          status: user.status
        });
        return user;
      }
    } else {
      console.log('❌ User lookup failed with status:', response.status);
      const errorText = await response.text();
      console.log('❌ Error details:', errorText);
      console.log('❌ User lookup URL:', url);
    }
    
    // If still not found, wait a moment and try cache again (for webhook timing)
    console.log('🔍 User not found, waiting for webhook cache...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      const { userCache } = await import('@/app/api/webhooks/directus/route');
      const cachedUser = userCache.get(email.toLowerCase());
      if (cachedUser) {
        console.log('✅ Found user in webhook cache after wait:', { id: cachedUser.userId, email: cachedUser.email });
        return {
          id: cachedUser.userId,
          email: cachedUser.email,
          role: process.env.NEXT_PUBLIC_ROLE_LORE_CREATOR_ID,
          status: 'active'
        };
      }
    } catch (error) {
      console.log('⚠️ Webhook cache still not available');
    }
    
    console.log('❌ No user found with email:', email);
    return null;
  } catch (error) {
    console.log('❌ Error in findUserByEmail:', error);
    authLogger.error('Error finding user by email', error as Error);
    return null;
  }
}

// Enhanced user lookup by username (last_name) with webhook cache fallback
async function findUserByUsername(username: string) {
  try {
    console.log('🔍 Finding user by username (last_name):', username);
    
    // First check webhook cache for recently created users
    try {
      const { userCache } = await import('@/app/api/webhooks/directus/route');
      const cachedUser = userCache.get(username.toLowerCase());
      if (cachedUser) {
        console.log('✅ Found user in webhook cache:', { id: cachedUser.userId });
        // Return a user object that matches the expected format
        return {
          id: cachedUser.userId,
          email: cachedUser.email,
          role: process.env.NEXT_PUBLIC_ROLE_LORE_CREATOR_ID,
          status: 'active'
        };
      }
    } catch (error) {
      console.log('⚠️ Webhook cache not available, falling back to API');
    }
    
    // Fallback to API lookup - Only query fields that exist
    const url = `${process.env.NEXT_PUBLIC_DIRECTUS_URL}/users?filter[last_name][_eq]=${encodeURIComponent(username.toLowerCase())}&fields=id,email,role,status,first_name,last_name,last_access`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.ADMIN_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log('🔍 User lookup response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('🔍 Total users found:', data.data ? data.data.length : 0);
      
      if (data.data && data.data.length > 0) {
        const user = data.data[0]; // Should only be one user with this username
        
        console.log('✅ Found user via API lookup:', {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          status: user.status
        });
        return user;
      }
    } else {
      console.log('❌ User lookup failed with status:', response.status);
      const errorText = await response.text();
      console.log('❌ Error details:', errorText);
    }
    
    // If still not found, wait a moment and try cache again (for webhook timing)
    console.log('🔍 User not found, waiting for webhook cache...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      const { userCache } = await import('@/app/api/webhooks/directus/route');
      const cachedUser = userCache.get(username.toLowerCase());
      if (cachedUser) {
        console.log('✅ Found user in webhook cache after wait:', { id: cachedUser.userId });
        return {
          id: cachedUser.userId,
          email: cachedUser.email,
          role: process.env.NEXT_PUBLIC_ROLE_LORE_CREATOR_ID,
          status: 'active'
        };
      }
    } catch (error) {
      console.log('⚠️ Webhook cache still not available');
    }
    
    console.log('❌ No user found with username (last_name):', username);
    return null;
  } catch (error) {
    console.log('❌ Error in findUserByUsername:', error);
    authLogger.error('Error finding user by username (last_name)', error as Error);
    return null;
  }
}

async function createDirectusUser(userData: any) {
  try {
    console.log('🔍 Creating Directus user with data:', JSON.stringify(userData, null, 2));
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_DIRECTUS_URL}/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.ADMIN_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    return data.data;
  } catch (error) {
    authLogger.error('Error creating Directus user', error as Error);
    throw error;
  }
}

async function updateDirectusUser(userId: string, userData: any) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_DIRECTUS_URL}/users/${userId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.ADMIN_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    return data.data;
  } catch (error) {
    authLogger.error('Error updating Directus user', error as Error);
    throw error;
  }
}

// Build providers array dynamically based on available credentials
function buildProviders() {
  const providers = [];
  
  // Always add Google provider if credentials are available
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    console.log('✅ Adding Google OAuth provider with credentials');
    providers.push(GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      },
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        };
      },
      checks: ['state', 'pkce'],
    }));
  } else {
    console.warn('⚠️ Google OAuth credentials missing - Google provider disabled');
  }
  
  // Only add GitHub provider if credentials are available
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    providers.push(GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      profile(profile) {
        return {
          id: profile.id.toString(),
          name: profile.name || profile.login,
          email: profile.email,
          image: profile.avatar_url,
        };
      },
      checks: ['state', 'pkce'],
    }));
  } else {
    console.warn('⚠️ GitHub OAuth credentials missing - GitHub provider disabled');
  }
  
  // Always add credentials provider
  providers.push(
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email or Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
        walletAddress: { label: 'Wallet Address', type: 'text' },
        walletToken: { label: 'Wallet Token', type: 'text' },
        isSignup: { label: 'Is Signup', type: 'text' },
        username: { label: 'Username', type: 'text' }
      },
      async authorize(credentials) {
        console.log('🔍 [CREDENTIALS PROVIDER] Credentials authorize triggered:', JSON.stringify(credentials, null, 2));
        console.log('🔍 [CREDENTIALS PROVIDER] All credentials keys:', Object.keys(credentials || {}));
        console.log('🔍 [CREDENTIALS PROVIDER] Credentials values:', credentials);
        
        // Handle wallet authentication
        if (credentials?.walletAddress && credentials?.walletToken) {
          console.log('🔍 [NEXTAUTH] Processing simple wallet authentication:', {
            walletAddress: credentials.walletAddress,
            walletToken: credentials.walletToken ? 'Present' : 'Missing'
          });
          return await handleSimpleWalletAuth(credentials.walletAddress, credentials.walletToken);
        }
        
        // Handle email/username + password authentication
        if (!credentials?.email || !credentials?.password) {
          console.log('❌ Missing credentials');
          throw new Error('INVALID_CREDENTIALS');
        }

        try {
          console.log('🔍 Environment check:');
          console.log('- DIRECTUS_URL:', process.env.NEXT_PUBLIC_DIRECTUS_URL);
          console.log('- ROLE_LORE_CREATOR_ID:', process.env.NEXT_PUBLIC_ROLE_LORE_CREATOR_ID || 'MISSING');
          
          // Handle signup flow
          if (credentials.isSignup === 'true') {
            console.log('🔍 [NEXTAUTH] Processing signup flow');
            return await handleCredentialsSignup(credentials);
          }
          
          // Handle regular login flow
          // Determine if input is email or username
          const isEmail = credentials.email.includes('@');
          let existingUser;
          
          if (isEmail) {
            // Handle email login
            existingUser = await findUserByEmail(credentials.email);
          } else {
            // Handle username login (using last_name field)
            existingUser = await findUserByUsername(credentials.email);
          }
          
          console.log('🔍 User lookup result:', existingUser ? { id: existingUser.id, email: existingUser.email, username: existingUser.username, role: existingUser.role, status: existingUser.status } : 'User not found');
          
          // If user not found, wait a moment and try again (for database consistency)
          if (!existingUser) {
            console.log('🔍 User not found, waiting 1 second and retrying...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            if (isEmail) {
              existingUser = await findUserByEmail(credentials.email);
            } else {
              existingUser = await findUserByUsername(credentials.email);
            }
            
            console.log('🔍 Retry user lookup result:', existingUser ? { id: existingUser.id, email: existingUser.email, username: existingUser.username, role: existingUser.role, status: existingUser.status } : 'User still not found');
          }
          
          if (!existingUser) {
            console.log('❌ User does not exist - cannot authenticate with credentials provider');
            throw new Error('ACCOUNT_NOT_FOUND');
          }

          // For users created via REST API, we need to verify the password properly
          console.log('✅ User exists, attempting password verification');
          
          // Use Directus authentication to verify credentials
          const authResponse = await fetch(`${process.env.NEXT_PUBLIC_DIRECTUS_URL}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: isEmail ? credentials.email.toLowerCase() : existingUser.email.toLowerCase(),
              password: credentials.password,
            }),
          });
          
          if (!authResponse.ok) {
            const errorData = await authResponse.json().catch(() => ({}));
            console.log('❌ Password verification failed:', authResponse.status, errorData);
            
            // Return appropriate error based on response
            if (authResponse.status === 401) {
              throw new Error('INVALID_CREDENTIALS');
            } else if (authResponse.status === 403) {
              if (errorData?.errors?.[0]?.message?.includes('locked')) {
                throw new Error('ACCOUNT_LOCKED');
              } else if (errorData?.errors?.[0]?.message?.includes('suspended')) {
                throw new Error('ACCOUNT_SUSPENDED');
              }
              throw new Error('ACCESS_DENIED');
            }
            throw new Error('SERVER_ERROR');
          }
          
          const authData = await authResponse.json();
          console.log('✅ Password verification successful');

          return {
            id: existingUser.id,
            email: existingUser.email,
            username: existingUser.last_name,
            name: `${existingUser.first_name || ''} ${existingUser.last_name || ''}`.trim() || existingUser.email,
            image: null,
            directusId: existingUser.id,
            directus_role_id: existingUser.role, // Store actual Directus role ID
          };
        } catch (error) {
          console.log('❌ Credentials authorize error:', error);
          // Re-throw the error to be handled by NextAuth
          throw error;
        }
      }
    })
  );
  
  return providers;
}

// Handle simple wallet authentication (no Redis/session manager dependency)
async function handleSimpleWalletAuth(walletAddress: string, walletToken: string) {
  try {
    console.log('🔍 [NEXTAUTH SIMPLE WALLET] Starting simple wallet authentication:', {
      walletAddress,
      walletToken: walletToken ? 'Present' : 'Missing'
    });
    
    // For simple wallet auth, we just need to verify the user exists
    // The token verification was already done in the simple-wallet/verify endpoint
    const userEmail = `${walletAddress.toLowerCase()}@wallet.lore.meme`;
    console.log('🔍 [NEXTAUTH SIMPLE WALLET] Looking for user:', userEmail);
    
    let existingUser = await findUserByEmail(userEmail);
    
    if (!existingUser) {
      console.log('❌ [NEXTAUTH SIMPLE WALLET] User not found, this should not happen');
      return null;
    }
    
    console.log('✅ [NEXTAUTH SIMPLE WALLET] User found:', { id: existingUser.id, email: existingUser.email, role: existingUser.role });
    
    // Check if user is suspended
    if (existingUser.status === 'suspended') {
      console.log('❌ [NEXTAUTH SIMPLE WALLET] User is suspended');
      return null;
    }
    
    // Update last access
    await updateDirectusUser(existingUser.id, {
      last_access: new Date().toISOString(),
    });
    
    const userObject = {
      id: existingUser.id,
      email: existingUser.email,
      name: `${existingUser.first_name || ''} ${existingUser.last_name || ''}`.trim() || `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
      image: null,
      directusId: existingUser.id,
      directus_role_id: existingUser.role, // Store actual Directus role ID
      walletAddress: walletAddress.toLowerCase()
    };
    
    console.log('✅ [NEXTAUTH SIMPLE WALLET] Authentication successful:', userObject);
    return userObject;
  } catch (error) {
    console.log('❌ [NEXTAUTH SIMPLE WALLET] Authentication error:', error);
    return null;
  }
}

// Handle credentials-based signup flow
async function handleCredentialsSignup(credentials: any) {
  try {
    console.log('🔍 [NEXTAUTH SIGNUP] Starting credentials signup flow:', {
      email: credentials.email,
      username: credentials.username
    });

    // Validate required fields
    if (!credentials.email || !credentials.password) {
      console.log('❌ [NEXTAUTH SIGNUP] Missing required fields');
      throw new Error('INVALID_CREDENTIALS');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(credentials.email)) {
      console.log('❌ [NEXTAUTH SIGNUP] Invalid email format');
      throw new Error('INVALID_EMAIL');
    }

    // Check if user already exists
    const existingUser = await findUserByEmail(credentials.email.toLowerCase());
    if (existingUser) {
      console.log('❌ [NEXTAUTH SIGNUP] User already exists');
      throw new Error('ACCOUNT_EXISTS');
    }

    // Create user in Directus
    console.log('🔍 [NEXTAUTH SIGNUP] Creating user in Directus');
    const newUser = await createDirectusUser({
      email: credentials.email.toLowerCase(),
      password: credentials.password,
      role: process.env.NEXT_PUBLIC_ROLE_LORE_CREATOR_ID,
      last_name: credentials.username,
      status: 'active',
    });

    console.log('✅ [NEXTAUTH SIGNUP] User created successfully:', {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role
    });

    // Verify the created user by authenticating with Directus
    const authResponse = await fetch(`${process.env.NEXT_PUBLIC_DIRECTUS_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: credentials.email.toLowerCase(),
        password: credentials.password,
      }),
    });

    if (!authResponse.ok) {
      console.log('❌ [NEXTAUTH SIGNUP] Failed to authenticate newly created user');
      throw new Error('SIGNUP_AUTH_FAILED');
    }

    console.log('✅ [NEXTAUTH SIGNUP] User authentication verified');

    // Return user object for NextAuth session
    return {
      id: newUser.id,
      email: newUser.email,
      username: newUser.last_name,
      name: `${newUser.first_name || ''} ${newUser.last_name || ''}`.trim() || newUser.email,
      image: null,
      directusId: newUser.id,
      directus_role_id: newUser.role,
    };
  } catch (error) {
    console.log('❌ [NEXTAUTH SIGNUP] Signup error:', error);
    authLogger.error('Credentials signup failed', error as Error);
    throw error;
  }
}

// Validate OAuth credentials on startup
validateOAuthCredentials();

// EXPORT THE AUTH CONFIG FOR USE IN OTHER API ROUTES
export const authConfig: NextAuthConfig = {
  providers: buildProviders(),
  callbacks: {
    async signIn(params: {
      user: any;
      account: any;
      profile?: any;
      email?: any;
      credentials?: any;
    }) {
      const { user, account } = params;
      console.log('🔍 [NEXTAUTH SIGNIN] SignIn callback triggered:', {
        userEmail: user.email,
        provider: account?.provider,
        userId: user.id,
        directusId: user.directusId
      });

      try {
        // For credentials provider (including signup), user data is already validated
        if (account?.provider === 'credentials') {
          console.log('✅ [NEXTAUTH SIGNIN] Credentials provider - user already validated');
          authLogger.info('Credentials authentication successful', {
            userId: user.directusId || user.id,
            email: user.email,
            isSignup: !!user.directusId
          });
          return true;
        }

        // Handle OAuth providers
        if (!user.email) {
          console.log('❌ [NEXTAUTH SIGNIN] No email provided for OAuth');
          authLogger.warn('SignIn attempt without email', { provider: account?.provider });
          throw new Error('INVALID_CREDENTIALS');
        }

        console.log('🔍 [NEXTAUTH SIGNIN] Processing OAuth authentication');

        // Check if user already exists in Directus
        const existingUser = await findUserByEmail(user.email.toLowerCase());

        let directusUser;
        
        if (!existingUser) {
          // Create new user for OAuth (standard behavior)
          const creatorRoleId = process.env.NEXT_PUBLIC_ROLE_LORE_CREATOR_ID;
          
          console.log('🔍 [NEXTAUTH SIGNIN] Creating new OAuth user with CREATOR role:', creatorRoleId);
          
          try {
            directusUser = await createDirectusUser({
              email: user.email.toLowerCase(),
              first_name: user.name?.split(' ')[0] || 'User',
              last_name: user.name?.split(' ').slice(1).join(' ') || '',
              external_identifier: `${account?.provider}:${account?.providerAccountId}`,
              provider: account?.provider || 'oauth',
              role: creatorRoleId, // Always assign CREATOR role ID
              status: 'active',
            });
            
            // Ensure the returned user has the role set
            directusUser.role = creatorRoleId;
            
            console.log('✅ [NEXTAUTH SIGNIN] OAuth user created successfully');
            authLogger.info('Created new CREATOR user via OAuth', {
              userId: directusUser.id,
              email: user.email.toLowerCase(),
              provider: account?.provider,
              roleId: creatorRoleId
            });
          } catch (createError) {
            console.log('❌ [NEXTAUTH SIGNIN] Error creating OAuth user:', createError);
            // If user creation fails due to email already existing, try to find the user again
            if (createError instanceof Error && createError.message.includes('RECORD_NOT_UNIQUE')) {
              console.log('🔍 [NEXTAUTH SIGNIN] User already exists, trying to find again...');
              directusUser = await findUserByEmail(user.email.toLowerCase());
              if (!directusUser) {
                console.log('❌ [NEXTAUTH SIGNIN] Still could not find user after unique constraint error');
                throw new Error('ACCOUNT_NOT_FOUND');
              }
            } else if (createError instanceof Error && createError.message.includes('rate limit')) {
              throw new Error('TOO_MANY_ATTEMPTS');
            } else {
              authLogger.error('Error creating Directus user during OAuth', createError as Error);
              throw new Error('SERVER_ERROR');
            }
          }
        } else {
          directusUser = existingUser;
          
          console.log('✅ [NEXTAUTH SIGNIN] Found existing OAuth user');
          
          // Check if user is suspended
          if (directusUser.status === 'suspended') {
            console.log('❌ [NEXTAUTH SIGNIN] User is suspended');
            authLogger.warn('OAuth signin attempt by suspended user', {
              userId: directusUser.id,
              email: user.email
            });
            throw new Error('ACCOUNT_SUSPENDED');
          }
          
          // Update last login
          await updateDirectusUser(directusUser.id, {
            last_access: new Date().toISOString(),
          });
          
          authLogger.info('Existing user authenticated via OAuth', {
            userId: directusUser.id,
            email: user.email.toLowerCase(),
            provider: account?.provider,
            roleId: directusUser.role
          });
        }

        // Store Directus user data for JWT callback
        (user as any).directusId = directusUser.id;
        (user as any).directus_role_id = directusUser.role; // Store actual role ID
        
        console.log('🔍 [NEXTAUTH SIGNIN] User role set to:', {
          userId: directusUser.id,
          roleId: directusUser.role,
          expectedRoleId: process.env.NEXT_PUBLIC_ROLE_LORE_CREATOR_ID,
          isMatch: directusUser.role === process.env.NEXT_PUBLIC_ROLE_LORE_CREATOR_ID
        });
        
        return true;
      } catch (error) {
        console.log('❌ [NEXTAUTH SIGNIN] SignIn callback error:', error);
        authLogger.error('SignIn callback error', error as Error);
        // Re-throw the error to be handled by NextAuth
        throw error;
      }
    },
    async jwt(params: {
      token: any;
      user?: any;
      account?: any;
      profile?: any;
      isNewUser?: boolean;
    }) {
      const { token, user, account } = params;

      try {
        // If user data is available (first time), store info in token
        if (user) {
          console.log('🔍 [NEXTAUTH JWT] Creating new JWT token:', {
            userId: user.id,
            directusId: (user as any).directusId,
            email: user.email,
            provider: account?.provider
          });

          token.directusId = (user as any).directusId;
          token.directus_role_id = (user as any).directus_role_id; // Store actual role ID
          token.email = user.email;
          token.name = user.name;
          token.image = user.image;
          token.walletAddress = (user as any).walletAddress; // Include wallet address
          
          console.log('✅ [NEXTAUTH JWT] Token created with role:', {
            directusId: token.directusId,
            roleId: token.directus_role_id,
            expectedRoleId: process.env.NEXT_PUBLIC_ROLE_LORE_CREATOR_ID,
            isMatch: token.directus_role_id === process.env.NEXT_PUBLIC_ROLE_LORE_CREATOR_ID,
            email: token.email
          });

          authLogger.info('JWT token created successfully', {
            directusId: token.directusId,
            email: token.email,
            provider: account?.provider
          });
        } else {
          console.log('🔍 [NEXTAUTH JWT] Refreshing existing JWT token:', {
            directusId: token.directusId,
            email: token.email
          });
        }

        return token;
      } catch (error) {
        console.log('❌ [NEXTAUTH JWT] JWT callback error:', error);
        authLogger.error('JWT callback error', error as Error);
        // Return original token on error to prevent authentication failure
        return token;
      }
    },
    async session(params: {
      session: any;
      token: any;
      user: any;
    }) {
      const { session, token } = params;

      try {
        console.log('🔍 [NEXTAUTH SESSION] Creating session:', {
          tokenDirectusId: token.directusId,
          tokenEmail: token.email,
          sessionEmail: session?.user?.email
        });

        // Add user data to session
        if (token && session.user) {
          (session.user as any).id = token.directusId as string;
          (session.user as any).directus_role_id = token.directus_role_id as string; // Store actual role ID
          (session.user as any).walletAddress = token.walletAddress as string; // Include wallet address
          session.user.email = token.email as string;
          session.user.name = token.name as string;
          session.user.image = token.image as string;
          
          console.log('✅ [NEXTAUTH SESSION] Session created with role:', {
            userId: session.user.id,
            roleId: (session.user as any).directus_role_id,
            expectedRoleId: process.env.NEXT_PUBLIC_ROLE_LORE_CREATOR_ID,
            isMatch: (session.user as any).directus_role_id === process.env.NEXT_PUBLIC_ROLE_LORE_CREATOR_ID,
            email: session.user.email
          });

          authLogger.info('Session created successfully', {
            userId: session.user.id,
            email: session.user.email,
            roleId: (session.user as any).directus_role_id
          });
        }

        return session;
      } catch (error) {
        console.log('❌ [NEXTAUTH SESSION] Session callback error:', error);
        authLogger.error('Session callback error', error as Error);
        // Return original session on error to prevent authentication failure
        return session;
      }
    }
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    error: '/auth/error', // Error code passed in query string as ?error=
  },
  debug: process.env.NODE_ENV === 'development',
};

const nextAuth = NextAuth(authConfig);

export const { auth, signIn, signOut } = nextAuth;
export const GET = nextAuth.handlers?.GET || nextAuth;
export const POST = nextAuth.handlers?.POST || nextAuth;
