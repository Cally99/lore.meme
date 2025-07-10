// app/api/auth/simple-wallet/verify/route.ts
import { NextResponse } from 'next/server';
import { verifyMessage } from 'viem';
import { randomBytes } from 'crypto';

// Use the same global nonces storage as the nonce endpoint
declare global {
  var simpleWalletNonces: Map<string, { nonce: string; timestamp: number }> | undefined;
}

// Initialize global nonces map if not already done
if (!global.simpleWalletNonces) {
  global.simpleWalletNonces = new Map();
}

const nonces = global.simpleWalletNonces;

// Simple user management functions (copied from existing NextAuth route)
async function findUserByEmail(email: string) {
  try {
    console.log('🔍 [SIMPLE WALLET VERIFY] Finding user by email:', email);
    
    const url = `${process.env.NEXT_PUBLIC_DIRECTUS_URL}/users`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.ADMIN_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.data && data.data.length > 0) {
        const user = data.data.find((u: any) => {
          const userEmail = u.email;
          const searchEmail = email.toLowerCase();
          const userEmailLower = userEmail ? userEmail.toLowerCase() : null;
          return userEmail && userEmailLower === searchEmail;
        });
        
        if (user) {
          console.log('✅ [SIMPLE WALLET VERIFY] Found user:', { id: user.id, email: user.email });
          return user;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.log('❌ [SIMPLE WALLET VERIFY] Error finding user:', error);
    return null;
  }
}

async function createDirectusUser(userData: any) {
  try {
    console.log('🔍 [SIMPLE WALLET VERIFY] Creating Directus user:', userData.email);
    
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
    console.log('✅ [SIMPLE WALLET VERIFY] User created:', data.data.id);
    return data.data;
  } catch (error) {
    console.log('❌ [SIMPLE WALLET VERIFY] Error creating user:', error);
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const { walletAddress, signature, message, nonce } = await request.json();
    
    console.log('🔍 [SIMPLE WALLET VERIFY] Verification request:', {
      walletAddress,
      hasSignature: !!signature,
      hasMessage: !!message,
      hasNonce: !!nonce
    });

    if (!walletAddress || !signature || !message || !nonce) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify nonce
    const storedNonceData = nonces.get(walletAddress.toLowerCase());
    if (!storedNonceData || storedNonceData.nonce !== nonce) {
      console.log('❌ [SIMPLE WALLET VERIFY] Invalid or expired nonce');
      return NextResponse.json(
        { error: 'Invalid or expired nonce' },
        { status: 401 }
      );
    }

    // Check if nonce is expired (5 minutes)
    const fiveMinutes = 5 * 60 * 1000;
    if (Date.now() - storedNonceData.timestamp > fiveMinutes) {
      console.log('❌ [SIMPLE WALLET VERIFY] Nonce expired');
      nonces.delete(walletAddress.toLowerCase());
      return NextResponse.json(
        { error: 'Nonce expired' },
        { status: 401 }
      );
    }

    console.log('✅ [SIMPLE WALLET VERIFY] Nonce verified');

    // Verify signature
    try {
      const isValid = await verifyMessage({
        address: walletAddress as `0x${string}`,
        message,
        signature: signature as `0x${string}`
      });
      
      if (!isValid) {
        console.log('❌ [SIMPLE WALLET VERIFY] Invalid signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    } catch (error) {
      console.log('❌ [SIMPLE WALLET VERIFY] Signature verification error:', error);
      return NextResponse.json(
        { error: 'Signature verification failed' },
        { status: 400 }
      );
    }

    console.log('✅ [SIMPLE WALLET VERIFY] Signature verified');

    // Create or find user
    const userEmail = `${walletAddress.toLowerCase()}@wallet.lore.meme`;
    let user = await findUserByEmail(userEmail);
    
    if (!user) {
      console.log('🔍 [SIMPLE WALLET VERIFY] Creating new user');
      const creatorRoleId = process.env.NEXT_PUBLIC_ROLE_LORE_CREATOR_ID;
      
      user = await createDirectusUser({
        email: userEmail,
        first_name: 'Wallet',
        last_name: `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
        external_identifier: `wallet:${walletAddress.toLowerCase()}`,
        provider: 'wallet',
        role: creatorRoleId,
        status: 'active',
      });
      
      console.log('✅ [SIMPLE WALLET VERIFY] New user created:', user.id);
    } else {
      console.log('✅ [SIMPLE WALLET VERIFY] Using existing user:', user.id);
      
      // Update last access
      try {
        await fetch(`${process.env.NEXT_PUBLIC_DIRECTUS_URL}/users/${user.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${process.env.ADMIN_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            last_access: new Date().toISOString(),
          }),
        });
      } catch (error) {
        console.log('⚠️ [SIMPLE WALLET VERIFY] Failed to update last access:', error);
      }
    }

    // Generate session token
    const sessionToken = randomBytes(32).toString('hex');
    
    // Clean up used nonce
    nonces.delete(walletAddress.toLowerCase());
    
    console.log('✅ [SIMPLE WALLET VERIFY] Verification completed successfully');

    return NextResponse.json({
      success: true,
      token: sessionToken,
      user: {
        id: user.id,
        email: user.email,
        walletAddress: walletAddress.toLowerCase()
      }
    });

  } catch (error) {
    console.log('❌ [SIMPLE WALLET VERIFY] Verification error:', error);
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}
