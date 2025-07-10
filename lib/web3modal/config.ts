// src/lib/web3modal/config.ts
import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet, sepolia } from 'wagmi/chains'

// Get project ID from environment
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id'

console.log('🔍 [WEB3MODAL CONFIG] Initializing with project ID:', projectId ? `${projectId.substring(0, 10)}...` : 'MISSING');

// Create the Wagmi adapter
const wagmiAdapter = new WagmiAdapter({
  networks: [mainnet, sepolia] as any,
  projectId,
  ssr: true
})

// Create and export AppKit instance
let appKit: any = null

// Create AppKit instance only on client side
if (typeof window !== 'undefined' && !appKit) {
  console.log('🔍 [WEB3MODAL CONFIG] Creating AppKit instance on client side');
  
  appKit = createAppKit({
    adapters: [wagmiAdapter],
    networks: [mainnet, sepolia] as any,
    projectId,
    metadata: {
      name: 'Lore.meme',
      description: 'Lore.meme - Meme Token Lore Platform',
      url: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001',
      icons: ['https://lore.meme/icon.png']
    },
    features: {
      analytics: false,
      email: false,
      socials: false,
      emailShowWallets: false
    },
    themeMode: 'light'
  })
  
  console.log('✅ [WEB3MODAL CONFIG] AppKit instance created successfully');
}

export { appKit, wagmiAdapter }
export const config = wagmiAdapter.wagmiConfig
