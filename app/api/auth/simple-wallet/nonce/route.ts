// app/api/auth/simple-wallet/nonce/route.ts
import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

// Simple in-memory nonce storage (no Redis) - use global to persist across requests
declare global {
  var simpleWalletNonces: Map<string, { nonce: string; timestamp: number }> | undefined;
}

// Initialize global nonces map
if (!global.simpleWalletNonces) {
  global.simpleWalletNonces = new Map();
  
  // Clean up expired nonces every 5 minutes
  setInterval(() => {
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    
    if (global.simpleWalletNonces) {
      for (const [address, data] of global.simpleWalletNonces.entries()) {
        if (now - data.timestamp > fiveMinutes) {
          global.simpleWalletNonces.delete(address);
        }
      }
    }
  }, 5 * 60 * 1000);
}

const nonces = global.simpleWalletNonces;

export async function POST(request: Request) {
  try {
    const { walletAddress } = await request.json();
    
    console.log('🔍 [SIMPLE WALLET NONCE] Request for:', walletAddress);
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Check if valid nonce already exists
    const existingNonce = nonces.get(walletAddress.toLowerCase());
    if (existingNonce) {
      const fiveMinutes = 5 * 60 * 1000;
      if (Date.now() - existingNonce.timestamp < fiveMinutes) {
        console.log('✅ [SIMPLE WALLET NONCE] Returning existing valid nonce for:', walletAddress);
        return NextResponse.json({
          success: true,
          nonce: existingNonce.nonce
        });
      }
    }

    // Generate new nonce only if none exists or expired
    const nonce = randomBytes(32).toString('hex');
    const timestamp = Date.now();
    
    // Store nonce with timestamp
    nonces.set(walletAddress.toLowerCase(), { nonce, timestamp });
    
    console.log('✅ [SIMPLE WALLET NONCE] Generated nonce for:', walletAddress);
    
    return NextResponse.json({
      success: true,
      nonce
    });

  } catch (error) {
    console.log('❌ [SIMPLE WALLET NONCE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate nonce' },
      { status: 500 }
    );
  }
}

// Export the nonces map for verification
export { nonces };