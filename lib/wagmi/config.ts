// src/lib/wagmi/config.ts
'use client'

import { createConfig, http, createStorage, noopStorage } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors'

// Get project ID from environment
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id'

// Singleton pattern to prevent multiple initializations
let wagmiConfig: ReturnType<typeof createConfig> | null = null

// Create safe storage that handles SSR
const createSafeStorage = () => {
  if (typeof window === 'undefined') {
    return noopStorage
  }
  
  try {
    return createStorage({
      storage: window.localStorage,
    })
  } catch (error) {
    console.warn('🔍 [WAGMI CONFIG] Storage initialization failed, using noop storage:', error);
    return noopStorage
  }
}

// Create wagmi config with singleton pattern
export const getWagmiConfig = () => {
  if (wagmiConfig) {
    return wagmiConfig
  }

  if (typeof window === 'undefined') {
    // Return a minimal config for SSR
    return createConfig({
      chains: [mainnet, sepolia],
      connectors: [],
      transports: {
        [mainnet.id]: http(),
        [sepolia.id]: http(),
      },
      storage: noopStorage,
      ssr: true,
    })
  }

  console.log('🔍 [WAGMI CONFIG] Initializing with project ID:', projectId ? `${projectId.substring(0, 10)}...` : 'MISSING');

  wagmiConfig = createConfig({
    chains: [mainnet, sepolia],
    connectors: [
      injected({
        target: 'metaMask',
      }),
      walletConnect({
        projectId,
        showQrModal: false,
        metadata: {
          name: 'Lore.meme',
          description: 'Lore.meme Web3 App',
          url: 'https://lore.meme',
          icons: ['https://lore.meme/icon.png']
        }
      }),
      coinbaseWallet({
        appName: 'Lore.meme',
        appLogoUrl: 'https://lore.meme/icon.png',
        preference: 'smartWalletOnly', // Faster initialization
      }),
    ],
    transports: {
      [mainnet.id]: http(),
      [sepolia.id]: http(),
    },
    storage: createSafeStorage(),
    ssr: true,
  })

  console.log('✅ [WAGMI CONFIG] Configuration created with connectors:', wagmiConfig.connectors.map(c => ({ id: c.id, name: c.name })));

  return wagmiConfig
}

// Export for backward compatibility
export const config = getWagmiConfig()
