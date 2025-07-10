import { NextResponse } from 'next/server';
import { createDirectus, rest, staticToken, createUser, authentication, readMe } from '@directus/sdk';

const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL!;
const adminToken = process.env.ADMIN_TOKEN!;
const newUserRoleId = process.env.NEXT_PUBLIC_ROLE_LORE_CREATOR_ID!;

export async function POST(request: Request) {
  if (!adminToken) {
    console.error("Register Route: ADMIN_TOKEN is not configured.");
    return NextResponse.json({ success: false, error: 'Server configuration error.' }, { status: 500 });
  }

  try {
    const { email, password, username } = await request.json();

    if (!password || password.length < 8) {
      return NextResponse.json({ success: false, error: 'Password must be at least 8 characters long.' }, { status: 400 });
    }

    const directusAdmin = createDirectus(directusUrl).with(staticToken(adminToken)).with(rest());
    
    // Create the user account
    await directusAdmin.request(
      createUser({
        first_name: username,
        email: email,
        password: password,
        role: newUserRoleId,
        status: 'active',
      })
    );
    
    // Use SDK authentication to login the new user
    const directusUserClient = createDirectus(directusUrl)
      .with(rest())
      .with(authentication('json', {
        autoRefresh: true,
        msRefreshBeforeExpires: 30000,
      }));
    
    // Login and get user data
    await directusUserClient.login(email, password);
    const user = await directusUserClient.request(readMe());

    // Return standardized response format
    return NextResponse.json({
      success: true,
      user,
      access_token: directusUserClient.getToken(),
      // SDK handles refresh tokens internally
    });

  } catch (error: any) {
    console.error('Registration error:', error);
    
    // Check for the specific unique constraint error from the database
    const errorMessage = error.errors?.[0]?.message.includes('unique')
      ? 'A user with this email already exists. Please sign in.'
      : (error.errors?.[0]?.message || 'Registration failed.');
      
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}