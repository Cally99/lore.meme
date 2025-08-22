import { describe, it, expect } from 'vitest';
import { fetch } from 'undici';

// Use the actual environment variables
const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://localhost:8055';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const LORE_CREATOR_ROLE_ID = process.env.NEXT_PUBLIC_ROLE_LORE_CREATOR_ID;

describe('Signup and Signin Integration', () => {
  // Skip tests if required environment variables are not set
  if (!ADMIN_TOKEN || !LORE_CREATOR_ROLE_ID) {
    it('requires environment variables to be set', () => {
      expect(ADMIN_TOKEN).toBeDefined();
      expect(LORE_CREATOR_ROLE_ID).toBeDefined();
    });
    return;
  }

  it('should create a new user and authenticate them in one flow', async () => {
    // Generate a unique email for testing
    const testEmail = `testuser-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    const testUsername = 'testuser';

    // Call the unified signup-and-signin endpoint
    const response = await fetch(`${DIRECTUS_URL}/auth/signup-and-signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        username: testUsername,
      }),
    });

    const data = await response.json();

    // Assert the response
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.user).toBeDefined();
    expect(data.user.email).toBe(testEmail.toLowerCase());
    expect(data.user.role).toBe(LORE_CREATOR_ROLE_ID);
    expect(data.token).toBeDefined();
    expect(data.expires).toBeDefined();

    // Clean up: Delete the test user
    // This would require an admin endpoint to delete users
    // For now, we'll leave it as the test user will be cleaned up manually
  });

  it('should return 400 for missing email or password', async () => {
    const response = await fetch(`${DIRECTUS_URL}/auth/signup-and-signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: '',
        password: '',
      }),
    });

    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Email and password are required');
  });

  it('should return 400 for invalid email format', async () => {
    const response = await fetch(`${DIRECTUS_URL}/auth/signup-and-signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'invalid-email',
        password: 'TestPassword123!',
      }),
    });

    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid email format');
  });

  it('should return 409 for existing user', async () => {
    // First, create a user using the unified endpoint
    const testEmail = `existing-user-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    
    const createResponse = await fetch(`${DIRECTUS_URL}/auth/signup-and-signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });

    expect(createResponse.status).toBe(200);

    // Try to create the same user again
    const duplicateResponse = await fetch(`${DIRECTUS_URL}/auth/signup-and-signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });

    const data = await duplicateResponse.json();

    expect(duplicateResponse.status).toBe(409);
    expect(data.error).toBe('User already exists');
  });
});