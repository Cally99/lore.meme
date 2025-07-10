import 'next-auth';

declare module 'next-auth' {
  interface User {
    id: string;
    role?: string;
  }

  interface Session extends DefaultSession {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
    } & DefaultSession["user"];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role?: string;
  }
}

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

