/**
 * Payment Request Generator
 * Generates QR codes and deep links for receiving payments across all chains
 */

import { ethers } from 'ethers';

export interface PaymentRequest {
  address: string;
  amount?: string;
  message?: string;
  qrData: string;
  deepLink: string;
  chainName: string;
  chainId?: string;
  explorerUrl?: string;
}

export interface PaymentRequestOptions {
  amount?: string;
  message?: string;
  label?: string; // For BIP-21
  requiredFeeRate?: number; // For Bitcoin
}

export class PaymentRequestGenerator {
  /**
   * Generate a payment request for any supported chain
   */
  static async generateRequest(
    tetherWdkService: any,
    chain: string,
    options: PaymentRequestOptions = {}
  ): Promise<PaymentRequest> {
    const addresses = await tetherWdkService.getAddresses();
    
    switch (chain.toLowerCase()) {
      case 'evm':
      case 'ethereum':
      case 'polygon':
        return this.generateEvmRequest(addresses.evmAddress, chain, options);
      
      case 'ton':
        return this.generateTonRequest(addresses.tonAddress, options);
      
      case 'btc':
      case 'bitcoin':
        return this.generateBtcRequest(addresses.btcAddress, options);
      
      case 'sol':
      case 'solana':
        return this.generateSolanaRequest(addresses.solAddress, options);
      
      case 'tron':
        return this.generateTronRequest(addresses.tronAddress, options);
      
      default:
        throw new Error(`Unsupported chain: ${chain}`);
    }
  }

  /**
   * Generate EVM payment request (EIP-681 standard)
   */
  private static generateEvmRequest(
    address: string, 
    chain: string, 
    options: PaymentRequestOptions
  ): PaymentRequest {
    const chainNames = {
      evm: 'Ethereum',
      ethereum: 'Ethereum',
      polygon: 'Polygon'
    };

    let qrData = `ethereum:${address}`;
    const params = new URLSearchParams();
    
    if (options.amount) {
      // Convert to wei for EIP-681
      params.set('value', ethers.parseEther(options.amount).toString());
    }
    
    if (options.message) {
      // Encode message as hex data
      params.set('data', ethers.hexlify(ethers.toUtf8Bytes(options.message)));
    }
    
    // Add chain ID for non-mainnet
    if (chain === 'polygon') {
      params.set('chainId', '137');
    }
    
    if (params.toString()) {
      qrData += `?${params.toString()}`;
    }

    // Generate explorer URL
    const explorerUrls = {
      ethereum: 'https://etherscan.io/address/',
      polygon: 'https://polygonscan.com/address/',
      evm: 'https://etherscan.io/address/'
    };

    return {
      address,
      amount: options.amount,
      message: options.message,
      qrData,
      deepLink: qrData,
      chainName: chainNames[chain as keyof typeof chainNames] || 'Ethereum',
      chainId: chain === 'polygon' ? '137' : '1',
      explorerUrl: explorerUrls[chain as keyof typeof explorerUrls] + address
    };
  }

  /**
   * Generate TON payment request
   */
  private static generateTonRequest(
    address: string, 
    options: PaymentRequestOptions
  ): PaymentRequest {
    let qrData = `ton://transfer/${address}`;
    const params = new URLSearchParams();
    
    if (options.amount) {
      // Convert to nanotons
      params.set('amount', Math.floor(parseFloat(options.amount) * 1e9).toString());
    }
    
    if (options.message) {
      params.set('text', options.message);
    }
    
    if (options.label) {
      params.set('bin', options.label);
    }
    
    if (params.toString()) {
      qrData += `?${params.toString()}`;
    }

    return {
      address,
      amount: options.amount,
      message: options.message,
      qrData,
      deepLink: qrData,
      chainName: 'TON',
      explorerUrl: `https://tonviewer.com/${address}`
    };
  }

  /**
   * Generate Bitcoin payment request (BIP-21 standard)
   */
  private static generateBtcRequest(
    address: string, 
    options: PaymentRequestOptions
  ): PaymentRequest {
    let qrData = `bitcoin:${address}`;
    const params = new URLSearchParams();
    
    if (options.amount) {
      params.set('amount', options.amount);
    }
    
    if (options.message) {
      params.set('message', options.message);
    }
    
    if (options.label) {
      params.set('label', options.label);
    }
    
    if (options.requiredFeeRate) {
      params.set('feeRate', options.requiredFeeRate.toString());
    }
    
    if (params.toString()) {
      qrData += `?${params.toString()}`;
    }

    return {
      address,
      amount: options.amount,
      message: options.message,
      qrData,
      deepLink: qrData,
      chainName: 'Bitcoin',
      explorerUrl: `https://blockstream.info/address/${address}`
    };
  }

  /**
   * Generate Solana payment request
   */
  private static generateSolanaRequest(
    address: string, 
    options: PaymentRequestOptions
  ): PaymentRequest {
    // Solana uses solana: scheme
    let qrData = `solana:${address}`;
    const params = new URLSearchParams();
    
    if (options.amount) {
      // Convert to lamports
      params.set('amount', Math.floor(parseFloat(options.amount) * 1e9).toString());
    }
    
    if (options.message) {
      params.set('memo', options.message);
    }
    
    if (options.label) {
      params.set('label', options.label);
    }
    
    if (params.toString()) {
      qrData += `?${params.toString()}`;
    }

    return {
      address,
      amount: options.amount,
      message: options.message,
      qrData,
      deepLink: qrData,
      chainName: 'Solana',
      explorerUrl: `https://solscan.io/account/${address}`
    };
  }

  /**
   * Generate TRON payment request
   */
  private static generateTronRequest(
    address: string, 
    options: PaymentRequestOptions
  ): PaymentRequest {
    // TRON uses tron: scheme
    let qrData = `tron:${address}`;
    const params = new URLSearchParams();
    
    if (options.amount) {
      // Convert to sun (1 TRX = 1,000,000 sun)
      params.set('amount', Math.floor(parseFloat(options.amount) * 1e6).toString());
    }
    
    if (options.message) {
      params.set('memo', options.message);
    }
    
    if (params.toString()) {
      qrData += `?${params.toString()}`;
    }

    return {
      address,
      amount: options.amount,
      message: options.message,
      qrData,
      deepLink: qrData,
      chainName: 'TRON',
      explorerUrl: `https://tronscan.org/#/address/${address}`
    };
  }

  /**
   * Generate Lightning Network invoice request
   */
  static generateLightningRequest(
    invoice: string,
    amountSats?: number,
    description?: string
  ): PaymentRequest {
    const qrData = `lightning:${invoice}`;
    
    return {
      address: invoice,
      amount: amountSats ? (amountSats / 1e8).toString() : undefined,
      message: description,
      qrData,
      deepLink: qrData,
      chainName: 'Lightning Network'
    };
  }

  /**
   * Parse a payment request from QR code or deep link
   */
  static parsePaymentRequest(uri: string): Partial<PaymentRequest> | null {
    try {
      const url = new URL(uri);
      const scheme = url.protocol.replace(':', '');
      
      switch (scheme) {
        case 'ethereum':
          return this.parseEvmRequest(uri);
        case 'bitcoin':
          return this.parseBtcRequest(uri);
        case 'ton':
          return this.parseTonRequest(uri);
        case 'solana':
          return this.parseSolanaRequest(uri);
        case 'tron':
          return this.parseTronRequest(uri);
        case 'lightning':
          return this.parseLightningRequest(uri);
        default:
          return null;
      }
    } catch (error) {
      console.error('Failed to parse payment request:', error);
      return null;
    }
  }

  private static parseEvmRequest(uri: string): Partial<PaymentRequest> {
    const url = new URL(uri);
    const address = url.pathname;
    const amount = url.searchParams.get('value');
    const data = url.searchParams.get('data');
    
    return {
      address,
      amount: amount ? ethers.formatEther(amount) : undefined,
      message: data ? ethers.toUtf8String(data) : undefined,
      chainName: 'Ethereum'
    };
  }

  private static parseBtcRequest(uri: string): Partial<PaymentRequest> {
    const url = new URL(uri);
    const address = url.pathname;
    
    return {
      address,
      amount: url.searchParams.get('amount') || undefined,
      message: url.searchParams.get('message') || undefined,
      chainName: 'Bitcoin'
    };
  }

  private static parseTonRequest(uri: string): Partial<PaymentRequest> {
    const url = new URL(uri);
    const address = url.pathname.replace('/transfer/', '');
    const amount = url.searchParams.get('amount');
    
    return {
      address,
      amount: amount ? (parseInt(amount) / 1e9).toString() : undefined,
      message: url.searchParams.get('text') || undefined,
      chainName: 'TON'
    };
  }

  private static parseSolanaRequest(uri: string): Partial<PaymentRequest> {
    const url = new URL(uri);
    const address = url.pathname;
    const amount = url.searchParams.get('amount');
    
    return {
      address,
      amount: amount ? (parseInt(amount) / 1e9).toString() : undefined,
      message: url.searchParams.get('memo') || undefined,
      chainName: 'Solana'
    };
  }

  private static parseTronRequest(uri: string): Partial<PaymentRequest> {
    const url = new URL(uri);
    const address = url.pathname;
    const amount = url.searchParams.get('amount');
    
    return {
      address,
      amount: amount ? (parseInt(amount) / 1e6).toString() : undefined,
      message: url.searchParams.get('memo') || undefined,
      chainName: 'TRON'
    };
  }

  private static parseLightningRequest(uri: string): Partial<PaymentRequest> {
    const invoice = uri.replace('lightning:', '');
    
    return {
      address: invoice,
      chainName: 'Lightning Network'
    };
  }

  /**
   * Validate a payment request
   */
  static validatePaymentRequest(request: PaymentRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!request.address) {
      errors.push('Address is required');
    }
    
    if (request.amount && isNaN(parseFloat(request.amount))) {
      errors.push('Invalid amount format');
    }
    
    if (request.amount && parseFloat(request.amount) <= 0) {
      errors.push('Amount must be positive');
    }
    
    // Chain-specific validation
    switch (request.chainName) {
      case 'Ethereum':
      case 'Polygon':
        if (!/^0x[a-fA-F0-9]{40}$/.test(request.address)) {
          errors.push('Invalid Ethereum address format');
        }
        break;
      
      case 'Bitcoin':
        if (!/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/.test(request.address)) {
          errors.push('Invalid Bitcoin address format');
        }
        break;
      
      case 'TON':
        if (!/^[EU]Q[A-Za-z0-9_-]{46}$/.test(request.address)) {
          errors.push('Invalid TON address format');
        }
        break;
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}