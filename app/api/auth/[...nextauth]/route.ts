// @ts-ignore
// Simplified NextAuth configuration - removed conflicting session management
import NextAuth, { type NextAuthConfig } from "next-auth";
import GoogleProvider from 'next-auth/providers/google';
import GithubProvider from 'next-auth/providers/github';
import CredentialsProvider from 'next-auth/providers/credentials';
import { authLogger } from '@/lib/monitoring/logger';

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

    // Fallback to API lookup
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

      if (data.data && data.data.length > 0) {
        const user = data.data[0];
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
    }

    console.log('❌ No user found with email:', email);
    return null;
  } catch (error) {
    console.log('❌ Error in findUserByEmail:', error);
    authLogger.error('Error finding user by email', error as Error);
    return null;
  }
}

// Enhanced user lookup by username
async function findUserByUsername(username: string) {
  try {
    console.log('🔍 Finding user by username (last_name):', username);

    // First check webhook cache
    try {
      const { userCache } = await import('@/app/api/webhooks/directus/route');
      const cachedUser = userCache.get(username.toLowerCase());
      if (cachedUser) {
        console.log('✅ Found user in webhook cache:', { id: cachedUser.userId });
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

    // Fallback to API lookup
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
        const user = data.data[0];
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
            existingUser = await findUserByEmail(credentials.email);
          } else {
            existingUser = await findUserByUsername(credentials.email);
          }

          console.log('🔍 User lookup result:', existingUser ? { id: existingUser.id, email: existingUser.email, username: existingUser.username, role: existingUser.role, status: existingUser.status } : 'User not found');

          if (!existingUser) {
            console.log('❌ User does not exist - cannot authenticate with credentials provider');
            throw new Error('ACCOUNT_NOT_FOUND');
          }

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
            directus_role_id: existingUser.role,
          };
        } catch (error) {
          console.log('❌ Credentials authorize error:', error);
          throw error;
        }
      }
    })
  );

  return providers;
}

// Handle simple wallet authentication
async function handleSimpleWalletAuth(walletAddress: string, walletToken: string) {
  try {
    console.log('🔍 [NEXTAUTH SIMPLE WALLET] Starting simple wallet authentication:', {
      walletAddress,
      walletToken: walletToken ? 'Present' : 'Missing'
    });

    const userEmail = `${walletAddress.toLowerCase()}@wallet.lore.meme`;
    console.log('🔍 [NEXTAUTH SIMPLE WALLET] Looking for user:', userEmail);

    let existingUser = await findUserByEmail(userEmail);

    if (!existingUser) {
      console.log('❌ [NEXTAUTH SIMPLE WALLET] User not found, this should not happen');
      return null;
    }

    console.log('✅ [NEXTAUTH SIMPLE WALLET] User found:', { id: existingUser.id, email: existingUser.email, role: existingUser.role });

    if (existingUser.status === 'suspended') {
      console.log('❌ [NEXTAUTH SIMPLE WALLET] User is suspended');
      return null;
    }

    await updateDirectusUser(existingUser.id, {
      last_access: new Date().toISOString(),
    });

    const userObject = {
      id: existingUser.id,
      email: existingUser.email,
      name: `${existingUser.first_name || ''} ${existingUser.last_name || ''}`.trim() || `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
      image: null,
      directusId: existingUser.id,
      directus_role_id: existingUser.role,
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

    if (!credentials.email || !credentials.password) {
      console.log('❌ [NEXTAUTH SIGNUP] Missing required fields');
      throw new Error('INVALID_CREDENTIALS');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(credentials.email)) {
      console.log('❌ [NEXTAUTH SIGNUP] Invalid email format');
      throw new Error('INVALID_EMAIL');
    }

    const existingUser = await findUserByEmail(credentials.email.toLowerCase());
    if (existingUser) {
      console.log('❌ [NEXTAUTH SIGNUP] User already exists');
      throw new Error('ACCOUNT_EXISTS');
    }

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

// EXPORT THE AUTH CONFIG FOR USE IN OTHER API ROUTES
export const authConfig: NextAuthConfig = {
  providers: buildProviders(),
  callbacks: {
    async signIn({ user, account }) {
      console.log('🔍 [NEXTAUTH SIGNIN] SignIn callback triggered:', {
        userEmail: user.email,
        provider: account?.provider,
        userId: user.id,
        directusId: user.directusId
      });

      try {
        if (account?.provider === 'credentials') {
          console.log('✅ [NEXTAUTH SIGNIN] Credentials provider - user already validated');
          authLogger.info('Credentials authentication successful', {
            userId: user.directusId || user.id,
            email: user.email,
          });
          return true;
        }

        if (!user.email) {
          console.log('❌ [NEXTAUTH SIGNIN] No email provided for OAuth');
          authLogger.warn('SignIn attempt without email', { provider: account?.provider });
          throw new Error('INVALID_CREDENTIALS');
        }

        console.log('🔍 [NEXTAUTH SIGNIN] Processing OAuth authentication');

        const existingUser = await findUserByEmail(user.email.toLowerCase());

        let directusUser;

        if (!existingUser) {
          const creatorRoleId = process.env.NEXT_PUBLIC_ROLE_LORE_CREATOR_ID;

          console.log('🔍 [NEXTAUTH SIGNIN] Creating new OAuth user with CREATOR role:', creatorRoleId);

          try {
            directusUser = await createDirectusUser({
              email: user.email.toLowerCase(),
              first_name: user.name?.split(' ')[0] || 'User',
              last_name: user.name?.split(' ').slice(1).join(' ') || '',
              external_identifier: `${account?.provider}:${account?.providerAccountId}`,
              provider: account?.provider || 'oauth',
              role: creatorRoleId,
              status: 'active',
            });

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
            if (createError instanceof Error && createError.message.includes('RECORD_NOT_UNIQUE')) {
              console.log('🔍 [NEXTAUTH SIGNIN] User already exists, trying to find again...');
              directusUser = await findUserByEmail(user.email.toLowerCase());
              if (!directusUser) {
                console.log('❌ [NEXTAUTH SIGNIN] Still could not find user after unique constraint error');
                throw new Error('ACCOUNT_NOT_FOUND');
              }
            } else {
              authLogger.error('Error creating Directus user during OAuth', createError as Error);
              throw new Error('SERVER_ERROR');
            }
          }
        } else {
          directusUser = existingUser;

          console.log('✅ [NEXTAUTH SIGNIN] Found existing OAuth user');

          if (directusUser.status === 'suspended') {
            console.log('❌ [NEXTAUTH SIGNIN] User is suspended');
            authLogger.warn('OAuth signin attempt by suspended user', {
              userId: directusUser.id,
              email: user.email
            });
            throw new Error('ACCOUNT_SUSPENDED');
          }

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

        (user as any).directusId = directusUser.id;
        (user as any).directus_role_id = directusUser.role;

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
        throw error;
      }
    },
    async jwt({ token, user, account }) {
      try {
        if (user) {
          console.log('🔍 [NEXTAUTH JWT] Creating new JWT token:', {
            userId: user.id,
            directusId: (user as any).directusId,
            email: user.email,
            provider: account?.provider
          });

          token.directusId = (user as any).directusId;
          token.directus_role_id = (user as any).directus_role_id;
          token.email = user.email;
          token.name = user.name;
          token.image = user.image;
          token.walletAddress = (user as any).walletAddress;

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
        return token;
      }
    },
    async session({ session, token }) {
      try {
        console.log('🔍 [NEXTAUTH SESSION] Creating session:', {
          tokenDirectusId: token.directusId,
          tokenEmail: token.email,
          sessionEmail: session?.user?.email
        });

        if (token && session.user) {
          (session.user as any).id = token.directusId as string;
          (session.user as any).directus_role_id = token.directus_role_id as string;
          (session.user as any).walletAddress = token.walletAddress as string;
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
        return session;
      }
    }
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    error: '/auth/error',
  },
  debug: process.env.NODE_ENV === 'development',
};

const nextAuth = NextAuth(authConfig);

export const { auth, signIn, signOut } = nextAuth;
export const GET = nextAuth.handlers?.GET || nextAuth;
export const POST = nextAuth.handlers?.POST || nextAuth;