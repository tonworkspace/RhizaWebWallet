/**
 * USDT Multi-Chain Service
 * Handles secure in-memory EVM address derivation from active session mnemonics
 * and queries USDT balances on TON (Jetton), BSC (BEP-20), and Ethereum (ERC-20).
 */

import { ethers, formatUnits } from 'ethers';
import { tonWalletService } from './tonWalletService';
import { secureSecretManager } from './secureSecretManager';
import { decryptMnemonic } from '../utils/encryption';
import { getDeviceKey } from '../utils/deviceFingerprint';
import { NetworkFailover, EVM_RPC_FAILOVER } from './networkFailover';

// Chain configurations & contracts
export const USDT_CONTRACTS = {
  ethereum: {
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    decimals: 6,
    rpcList: EVM_RPC_FAILOVER.ethereum
  },
  bsc: {
    address: '0x55d398326f99059fF775485246999027B3197955',
    decimals: 18,
    rpcList: EVM_RPC_FAILOVER.bsc
  },
  tron: {
    address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
    decimals: 6,
    rpcList: []
  }
};

// TON USDT Jetton Master
export const TON_USDT_MASTER = 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs';

export interface USDTBalances {
  ton: string;
  bsc: string;
  ethereum: string;
  tron: string;
  total: string;
}

export class USDTMultiChainService {
  /**
   * Derive active EVM address from user's session mnemonic
   */
  async deriveEvmAddress(tonAddress: string): Promise<string | null> {
    try {
      const activeWalletType = typeof localStorage !== 'undefined' ? localStorage.getItem('rhiza_active_wallet_type') : null;
      if (activeWalletType === 'secondary') {
        const { tetherWdkService } = await import('./tetherWdkService');
        const addrs = await tetherWdkService.getAddresses();
        if (addrs && addrs.evmAddress) {
          console.log('🔑 Retrieved EVM address from WDK successfully:', addrs.evmAddress);
          return addrs.evmAddress;
        }
      }

      const mnemonic = await this.getDecryptedMnemonic(tonAddress);
      if (!mnemonic || mnemonic.length === 0) {
        console.warn('⚠️ No active session mnemonic found for EVM address derivation');
        return null;
      }

      // Convert mnemonic array to string
      const mnemonicPhrase = mnemonic.join(' ');

      // Bypass strict BIP39 checksum validation (which fails for many TON mnemonics)
      // by generating the PBKDF2 seed directly using standard BIP39 parameters.
      const password = ethers.toUtf8Bytes(mnemonicPhrase.normalize('NFKD'));
      const salt = ethers.toUtf8Bytes("mnemonic");
      const seed = ethers.pbkdf2(password, salt, 2048, 64, "sha512");

      // Derive EVM Address using standard m/44'/60'/0'/0/0 BIP-44 path
      const rootWallet = ethers.HDNodeWallet.fromSeed(seed);
      const wallet = rootWallet.derivePath("m/44'/60'/0'/0/0");
      
      console.log('🔑 Derived EVM address successfully:', wallet.address);
      return wallet.address;
    } catch (error) {
      console.error('❌ Failed to derive EVM address from seed:', error);
      return null;
    }
  }

  /**
   * Fetch active decrypted mnemonic from cache or secure storage
   */
  private async getDecryptedMnemonic(tonAddress: string): Promise<string[] | null> {
    // 1. Try to read from SecureSecretManager cache first
    const walletId = `wallet_${tonAddress.slice(0, 8)}`;
    const cached = secureSecretManager.getCachedMnemonic(walletId);
    if (cached) {
      return cached;
    }

    // 2. Fall back to decrypting the primary localStorage session directly
    const encrypted = localStorage.getItem('rhiza_session');
    const type = localStorage.getItem('rhiza_session_encrypted');

    if (!encrypted) return null;

    try {
      if (type === 'device') {
        const deviceKey = await getDeviceKey();
        return await decryptMnemonic(encrypted, deviceKey);
      }
      
      // If password-encrypted and not cached, we need the user's password (return null for background fetches)
      return null;
    } catch (e) {
      console.error('[USDTMultiChain] Direct session decryption failed:', e);
      return null;
    }
  }

  /**
   * Fetch USDT balance for a specific EVM contract address
   */
  private async fetchEvmUsdtBalance(
    evmAddress: string,
    contractAddress: string,
    decimals: number,
    rpcUrls: string[]
  ): Promise<string> {
    try {
      const workingRpc = await NetworkFailover.getWorkingRpc(rpcUrls);
      const provider = new ethers.JsonRpcProvider(workingRpc);
      
      // Minimal ERC-20 ABI for balance check
      const abi = ['function balanceOf(address owner) view returns (uint256)'];
      const contract = new ethers.Contract(contractAddress, abi, provider);
      
      const balance = await contract.balanceOf(evmAddress);
      return parseFloat(formatUnits(balance, decimals)).toFixed(2);
    } catch (error) {
      console.warn(`⚠️ Failed to fetch EVM USDT balance for ${contractAddress}:`, error);
      return '0.00';
    }
  }

  /**
   * Fetch USDT balance on TON (using primary wallet getJettons or direct TonCenter fetch)
   */
  private async fetchTonUsdtBalance(tonAddress: string, network: 'mainnet' | 'testnet'): Promise<string> {
    try {
      const jettonResult = await tonWalletService.getJettons(tonAddress);
      if (jettonResult.success && jettonResult.jettons) {
        const usdtJetton = jettonResult.jettons.find(
          (j: any) =>
            // Primary: match on the master contract address (canonical, returned by TonCenter V3)
            j.jetton?.address === TON_USDT_MASTER ||
            // Fallback: raw wallet address field used in some response shapes
            j.walletAddress?.address?.toString() === TON_USDT_MASTER ||
            // Fallback: match by symbol for cases where address encoding differs
            j.jetton?.symbol === 'USDT' || j.jetton?.symbol === 'jUSDT'
        );
        if (usdtJetton && usdtJetton.balance !== undefined) {
          const decimals = usdtJetton.jetton?.decimals || 6;
          return (Number(usdtJetton.balance) / Math.pow(10, decimals)).toFixed(2);
        }
      }
      return '0.00';
    } catch (error) {
      console.warn('⚠️ Failed to fetch TON USDT Jetton balance:', error);
      return '0.00';
    }
  }

  /**
   * Fetch USDT balance on TRON using TronGrid API
   */
  private async fetchTronUsdtBalance(tronAddress: string, network: 'mainnet' | 'testnet'): Promise<string> {
    try {
      const baseUrl = network === 'mainnet' ? 'https://api.trongrid.io' : 'https://api.shasta.trongrid.io';
      const res = await fetch(`${baseUrl}/v1/accounts/${tronAddress}`);
      if (!res.ok) return '0.00';
      const json = await res.json();
      if (json.data && json.data.length > 0) {
        const trc20 = json.data[0].trc20 || [];
        const usdtToken = trc20.find((token: any) => Object.keys(token)[0] === USDT_CONTRACTS.tron.address);
        if (usdtToken) {
          const balance = Object.values(usdtToken)[0] as string;
          return (Number(balance) / Math.pow(10, USDT_CONTRACTS.tron.decimals)).toFixed(2);
        }
      }
      return '0.00';
    } catch (e) {
      console.warn('⚠️ Failed to fetch TRON USDT balance:', e);
      return '0.00';
    }
  }

  /**
   * Get unified USDT balances across all supported networks
   */
  async getUSDTBalances(
    tonAddress: string,
    evmAddress: string | null,
    tronAddress: string | null,
    network: 'mainnet' | 'testnet'
  ): Promise<USDTBalances> {
    // 1. Fetch TON USDT balance
    const tonBalance = await this.fetchTonUsdtBalance(tonAddress, network);

    // 2. Fetch EVM and TRON USDT balances
    let bscBalance = '0.00';
    let ethBalance = '0.00';
    let tronBalance = '0.00';

    const promises: Promise<void>[] = [];

    if (evmAddress) {
      promises.push(this.fetchEvmUsdtBalance(
        evmAddress,
        USDT_CONTRACTS.bsc.address,
        USDT_CONTRACTS.bsc.decimals,
        USDT_CONTRACTS.bsc.rpcList
      ).then(res => { bscBalance = res; }));
      
      promises.push(this.fetchEvmUsdtBalance(
        evmAddress,
        USDT_CONTRACTS.ethereum.address,
        USDT_CONTRACTS.ethereum.decimals,
        USDT_CONTRACTS.ethereum.rpcList
      ).then(res => { ethBalance = res; }));
    }

    if (tronAddress) {
      promises.push(this.fetchTronUsdtBalance(tronAddress, network).then(res => { tronBalance = res; }));
    }

    await Promise.all(promises);

    // 3. Sum total USDT balance
    const total = (
      parseFloat(tonBalance) +
      parseFloat(bscBalance) +
      parseFloat(ethBalance) +
      parseFloat(tronBalance)
    ).toFixed(2);

    return {
      ton: tonBalance,
      bsc: bscBalance,
      ethereum: ethBalance,
      tron: tronBalance,
      total
    };
  }
}

export const usdtMultiChainService = new USDTMultiChainService();
