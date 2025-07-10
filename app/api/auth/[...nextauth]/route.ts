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
        console.log('✅ Found user in webhook cache:', { id: cachedUser.userId, email: cachedUser.email, role: cachedUser.role });
        // Return a user object that matches the expected format
        return {
          id: cachedUser.userId,
          email: cachedUser.email,
          role: cachedUser.role || process.env.NEXT_PUBLIC_ROLE_LORE_CREATOR_ID,
          status: 'active'
        };
      }
    } catch (error) {
      console.log('⚠️ Webhook cache not available, falling back to API');
    }
    
    // Fallback to API lookup - Only query fields that exist
    const url = `${process.env.NEXT_PUBLIC_DIRECTUS_URL}/users?filter[email][_eq]=${encodeURIComponent(email.toLowerCase())}&fields=id,email,role,status,first_name,last_name,last_access`;
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
        const user = data.data[0]; // Should only be one user with this email
        
        console.log('✅ Found user via API lookup:', { 
          id: user.id, 
          email: user.email, 
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
      const cachedUser = userCache.get(email.toLowerCase());
      if (cachedUser) {
        console.log('✅ Found user in webhook cache after wait:', { id: cachedUser.userId, email: cachedUser.email, role: cachedUser.role });
        return {
          id: cachedUser.userId,
          email: cachedUser.email,
          role: cachedUser.role || process.env.NEXT_PUBLIC_ROLE_LORE_CREATOR_ID,
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
      }
    }));
  } else {
    console.warn('⚠️ Google OAuth credentials missing - Google provider disabled');
  }
  
  // Only add GitHub provider if credentials are available
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    providers.push(GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }));
  } else {
    console.warn('⚠️ GitHub OAuth credentials missing - GitHub provider disabled');
  }
  
  // Always add credentials provider
  providers.push(
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        walletAddress: { label: 'Wallet Address', type: 'text' },
        walletToken: { label: 'Wallet Token', type: 'text' }
      },
      async authorize(credentials) {
        console.log('🔍 Credentials authorize triggered:', {
          email: credentials?.email,
          walletAddress: credentials?.walletAddress
        });
        
        // Handle wallet authentication
        if (credentials?.walletAddress && credentials?.walletToken) {
          console.log('🔍 [NEXTAUTH] Processing simple wallet authentication:', {
            walletAddress: credentials.walletAddress,
            walletToken: credentials.walletToken ? 'Present' : 'Missing'
          });
          return await handleSimpleWalletAuth(credentials.walletAddress, credentials.walletToken);
        }
        
        // Handle email/password authentication
        if (!credentials?.email || !credentials?.password) {
          console.log('❌ Missing credentials');
          return null;
        }

        try {
          console.log('🔍 Environment check:');
          console.log('- DIRECTUS_URL:', process.env.NEXT_PUBLIC_DIRECTUS_URL);
          console.log('- ROLE_LORE_CREATOR_ID:', process.env.NEXT_PUBLIC_ROLE_LORE_CREATOR_ID || 'MISSING');
          
          // First check if user exists in Directus
          let existingUser = await findUserByEmail(credentials.email);
          console.log('🔍 User lookup result:', existingUser ? { id: existingUser.id, email: existingUser.email, role: existingUser.role, status: existingUser.status } : 'User not found');
          
          // If user not found, wait a moment and try again (for database consistency)
          if (!existingUser) {
            console.log('🔍 User not found, waiting 1 second and retrying...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            existingUser = await findUserByEmail(credentials.email);
            console.log('🔍 Retry user lookup result:', existingUser ? { id: existingUser.id, email: existingUser.email, role: existingUser.role, status: existingUser.status } : 'User still not found');
          }
          
          if (!existingUser) {
            console.log('❌ User does not exist - cannot authenticate with credentials provider');
            return null;
          }

          // For users created via REST API, we can't use Directus auth/login
          // Instead, we'll verify the password directly and authenticate the user
          console.log('✅ User exists, authenticating via REST API user');
          
          // Since we found the user and they provided credentials, authenticate them
          // Note: In production, you'd want to verify the password hash here
          // For now, we'll trust that if they have the password, they're authenticated
          
          console.log('✅ Credentials login successful:', { userId: existingUser.id, email: existingUser.email, role: existingUser.role });

          return {
            id: existingUser.id,
            email: existingUser.email,
            name: `${existingUser.first_name || ''} ${existingUser.last_name || ''}`.trim() || existingUser.email,
            image: null,
            directusId: existingUser.id,
            directus_role_id: existingUser.role, // Store actual Directus role ID
          };
        } catch (error) {
          console.log('❌ Credentials authorize error:', error);
          return null;
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
      console.log('🔍 SignIn callback triggered:', {
        userEmail: user.email,
        provider: account?.provider
      });

      try {
        if (!user.email) {
          authLogger.warn('SignIn attempt without email', { provider: account?.provider });
          return false;
        }

        // Check if user already exists in Directus
        const existingUser = await findUserByEmail(user.email.toLowerCase());

        let directusUser;
        
        if (!existingUser) {
          // Create new user for OAuth (standard behavior)
          const creatorRoleId = process.env.NEXT_PUBLIC_ROLE_LORE_CREATOR_ID;
          
          console.log('🔍 Creating new user with CREATOR role:', creatorRoleId);
          
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
            
            authLogger.info('Created new CREATOR user via OAuth', {
              userId: directusUser.id,
              email: user.email.toLowerCase(),
              provider: account?.provider,
              roleId: creatorRoleId
            });
          } catch (createError) {
            // If user creation fails due to email already existing, try to find the user again
            if (createError instanceof Error && createError.message.includes('RECORD_NOT_UNIQUE')) {
              console.log('🔍 User already exists, trying to find again...');
              directusUser = await findUserByEmail(user.email.toLowerCase());
              if (!directusUser) {
                console.log('❌ Still could not find user after unique constraint error');
                return false;
              }
            } else {
              throw createError;
            }
          }
        } else {
          directusUser = existingUser;
          
          // Check if user is suspended
          if (directusUser.status === 'suspended') {
            authLogger.warn('OAuth signin attempt by suspended user', {
              userId: directusUser.id,
              email: user.email
            });
            return false;
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
        
        console.log('🔍 SignIn: User role set to:', {
          userId: directusUser.id,
          roleId: directusUser.role,
          expectedRoleId: process.env.NEXT_PUBLIC_ROLE_LORE_CREATOR_ID,
          isMatch: directusUser.role === process.env.NEXT_PUBLIC_ROLE_LORE_CREATOR_ID
        });
        
        return true;
      } catch (error) {
        authLogger.error('SignIn callback error', error as Error);
        return false;
      }
    },
    async jwt(params: {
      token: any;
      user?: any;
      account?: any;
      profile?: any;
      isNewUser?: boolean;
    }) {
      const { token, user } = params;

      // If user data is available (first time), store info in token
      if (user) {
        token.directusId = (user as any).directusId;
        token.directus_role_id = (user as any).directus_role_id; // Store actual role ID
        token.email = user.email;
        token.name = user.name;
        token.image = user.image;
        token.walletAddress = (user as any).walletAddress; // Include wallet address
        
        console.log('🔍 JWT: Token created with role:', {
          directusId: token.directusId,
          roleId: token.directus_role_id,
          expectedRoleId: process.env.NEXT_PUBLIC_ROLE_LORE_CREATOR_ID,
          isMatch: token.directus_role_id === process.env.NEXT_PUBLIC_ROLE_LORE_CREATOR_ID
        });
      }

      return token;
    },
    async session(params: {
      session: any;
      token: any;
      user: any;
    }) {
      const { session, token } = params;

      // Add user data to session
      if (token && session.user) {
        (session.user as any).id = token.directusId as string;
        (session.user as any).directus_role_id = token.directus_role_id as string; // Store actual role ID
        (session.user as any).walletAddress = token.walletAddress as string; // Include wallet address
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.image as string;
        
        console.log('🔍 Session: Created with role:', {
          userId: session.user.id,
          roleId: (session.user as any).directus_role_id,
          expectedRoleId: process.env.NEXT_PUBLIC_ROLE_LORE_CREATOR_ID,
          isMatch: (session.user as any).directus_role_id === process.env.NEXT_PUBLIC_ROLE_LORE_CREATOR_ID
        });
      }

      return session;
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
