// src/lib/api/clients/walletClient.ts
import { BaseApiClient } from './baseClient';

export interface TokenBalance {
  symbol: string;
  name: string;
  balance: string;
  value: number;
  address?: string;
  decimals: number;
  logo?: string;
}

export class WalletClient extends BaseApiClient {
  constructor() {
    super('/api/wallet');
  }
  
  async getTokenBalances(address: string) {
    return this.get<TokenBalance[]>(`/balances?address=${address}`);
  }
  
  async getNFTs(address: string, page = 1, limit = 20) {
    return this.get(`/nfts?address=${address}&page=${page}&limit=${limit}`);
  }
  
  async getTransactions(address: string, page = 1, limit = 20) {
    return this.get(`/transactions?address=${address}&page=${page}&limit=${limit}`);
  }
  
  async verifyMessage(address: string, message: string, signature: string) {
    return this.post('/verify', { address, message, signature });
  }
}

// Create a singleton instance
export const walletClient = new WalletClient();