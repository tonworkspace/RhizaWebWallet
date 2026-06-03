import { supabaseService } from './supabaseService';

// ============================================================================
// TYPES
// ============================================================================

export type InvoiceStatus =
  | 'pending'      // Invoice created, user hasn't confirmed yet
  | 'processing'   // Payment broadcast, waiting for confirmation
  | 'completed'    // Wallet activated, all done
  | 'failed'       // Payment failed with error
  | 'expired'      // 24h passed without payment
  | 'cancelled';   // User explicitly cancelled

export interface PaymentInvoice {
  id: string;
  invoice_number: string;
  user_id: string | null;
  wallet_address: string;

  package_id: string;
  package_name: string;
  price_usd: number;
  activation_fee_usd: number;
  total_usd: number;
  total_ton: number;
  ton_price_usd: number;
  rzc_reward: number;

  payment_address: string;
  referrer_wallet: string | null;
  commission_ton: number;
  platform_ton: number | null;

  status: InvoiceStatus;
  tx_hash: string | null;
  network: string;
  payment_method: 'auto' | 'manual';

  created_at: string;
  expires_at: string;
  paid_at: string | null;
  activated_at: string | null;
  updated_at: string;
  error_message: string | null;
  retry_count: number;
}

export interface CreateInvoiceParams {
  walletAddress: string;
  userId?: string | null;
  packageId: string;
  packageName: string;
  priceUsd: number;
  activationFeeUsd: number;
  totalUsd: number;
  totalTon: number;
  tonPriceUsd: number;
  rzcReward: number;
  paymentAddress: string;
  referrerWallet?: string | null;
  commissionTon?: number;
  platformTon?: number;
  network: string;
  paymentMethod: 'auto' | 'manual';
}

// ============================================================================
// INVOICE SERVICE
// ============================================================================

class InvoiceService {
  private readonly TABLE = 'payment_invoices';

  // --------------------------------------------------------------------------
  // Generate human-readable invoice number: INV-YYYYMMDD-XXXX
  // --------------------------------------------------------------------------
  private generateInvoiceNumber(): string {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `INV-${date}-${rand}`;
  }

  // --------------------------------------------------------------------------
  // Create invoice at checkout open — before any payment attempt
  // --------------------------------------------------------------------------
  async createInvoice(params: CreateInvoiceParams): Promise<PaymentInvoice | null> {
    const client = supabaseService.getClient();
    if (!client) return null;

    try {
      const invoiceNumber = this.generateInvoiceNumber();
      const { data, error } = await client
        .from(this.TABLE)
        .insert({
          invoice_number: invoiceNumber,
          user_id: params.userId || null,
          wallet_address: params.walletAddress,
          package_id: params.packageId,
          package_name: params.packageName,
          price_usd: params.priceUsd,
          activation_fee_usd: params.activationFeeUsd,
          total_usd: params.totalUsd,
          total_ton: params.totalTon,
          ton_price_usd: params.tonPriceUsd,
          rzc_reward: params.rzcReward,
          payment_address: params.paymentAddress,
          referrer_wallet: params.referrerWallet || null,
          commission_ton: params.commissionTon || 0,
          platform_ton: params.platformTon || null,
          status: 'pending',
          network: params.network,
          payment_method: params.paymentMethod,
        })
        .select()
        .single();

      if (error) throw error;

      // Persist to localStorage so user can always find it
      this.persistToLocal(data as PaymentInvoice);
      console.log(`[Invoice] Created ${invoiceNumber}`);
      return data as PaymentInvoice;
    } catch (err) {
      console.error('[Invoice] Create failed:', err);
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // Update invoice status at each lifecycle step
  // --------------------------------------------------------------------------
  async updateStatus(
    invoiceId: string,
    status: InvoiceStatus,
    extras?: {
      txHash?: string;
      errorMessage?: string;
      paymentMethod?: 'auto' | 'manual';
    }
  ): Promise<boolean> {
    const client = supabaseService.getClient();
    if (!client) return false;

    try {
      const patch: Record<string, any> = { status };

      if (extras?.txHash)        patch.tx_hash = extras.txHash;
      if (extras?.errorMessage)  patch.error_message = extras.errorMessage;
      if (extras?.paymentMethod) patch.payment_method = extras.paymentMethod;

      if (status === 'processing') patch.paid_at = new Date().toISOString();
      if (status === 'completed')  patch.activated_at = new Date().toISOString();

      const { error } = await client
        .from(this.TABLE)
        .update(patch)
        .eq('id', invoiceId);

      if (error) throw error;

      // Update local cache too
      const local = this.getLocalInvoice(invoiceId);
      if (local) this.persistToLocal({ ...local, ...patch, updated_at: new Date().toISOString() });

      return true;
    } catch (err) {
      console.error('[Invoice] Status update failed:', err);
      return false;
    }
  }

  // --------------------------------------------------------------------------
  // Increment retry count on re-attempt
  // --------------------------------------------------------------------------
  async incrementRetry(invoiceId: string): Promise<void> {
    const client = supabaseService.getClient();
    if (!client) return;
    try {
      await client.rpc('increment_invoice_retry', { p_invoice_id: invoiceId });
    } catch {
      // non-critical
    }
  }

  // --------------------------------------------------------------------------
  // Fetch single invoice by ID
  // --------------------------------------------------------------------------
  async getInvoice(invoiceId: string): Promise<PaymentInvoice | null> {
    const client = supabaseService.getClient();
    if (!client) return this.getLocalInvoice(invoiceId);

    try {
      const { data, error } = await client
        .from(this.TABLE)
        .select('*')
        .eq('id', invoiceId)
        .single();

      if (error) throw error;
      this.persistToLocal(data as PaymentInvoice);
      return data as PaymentInvoice;
    } catch {
      return this.getLocalInvoice(invoiceId);
    }
  }

  // --------------------------------------------------------------------------
  // Fetch invoice by invoice number (for user lookup)
  // --------------------------------------------------------------------------
  async getInvoiceByNumber(invoiceNumber: string): Promise<PaymentInvoice | null> {
    const client = supabaseService.getClient();
    if (!client) return null;

    try {
      const { data, error } = await client
        .from(this.TABLE)
        .select('*')
        .eq('invoice_number', invoiceNumber)
        .single();

      if (error) throw error;
      return data as PaymentInvoice;
    } catch {
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // Get all invoices for a wallet address
  // --------------------------------------------------------------------------
  async getWalletInvoices(walletAddress: string, limit = 20): Promise<PaymentInvoice[]> {
    const client = supabaseService.getClient();
    if (!client) return this.getLocalInvoices(walletAddress);

    try {
      const { data, error } = await client
        .from(this.TABLE)
        .select('*')
        .eq('wallet_address', walletAddress)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as PaymentInvoice[];
    } catch {
      return this.getLocalInvoices(walletAddress);
    }
  }

  // --------------------------------------------------------------------------
  // Get the most recent pending/processing invoice for a wallet
  // (used to resume interrupted payments)
  // --------------------------------------------------------------------------
  async getPendingInvoice(walletAddress: string): Promise<PaymentInvoice | null> {
    const client = supabaseService.getClient();
    if (!client) return null;

    try {
      const { data, error } = await client
        .from(this.TABLE)
        .select('*')
        .eq('wallet_address', walletAddress)
        .in('status', ['pending', 'processing'])
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as PaymentInvoice | null;
    } catch {
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // localStorage helpers — fallback when DB is unreachable
  // --------------------------------------------------------------------------
  private localKey(id: string) { return `rzc_invoice_${id}`; }
  private localListKey(wallet: string) { return `rzc_invoices_${wallet}`; }

  persistToLocal(invoice: PaymentInvoice): void {
    try {
      localStorage.setItem(this.localKey(invoice.id), JSON.stringify(invoice));
      // Maintain a per-wallet index
      const listRaw = localStorage.getItem(this.localListKey(invoice.wallet_address));
      const list: string[] = listRaw ? JSON.parse(listRaw) : [];
      if (!list.includes(invoice.id)) {
        list.unshift(invoice.id);
        localStorage.setItem(this.localListKey(invoice.wallet_address), JSON.stringify(list.slice(0, 50)));
      }
    } catch { /* storage full or private mode */ }
  }

  getLocalInvoice(id: string): PaymentInvoice | null {
    try {
      const raw = localStorage.getItem(this.localKey(id));
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  getLocalInvoices(walletAddress: string): PaymentInvoice[] {
    try {
      const listRaw = localStorage.getItem(this.localListKey(walletAddress));
      if (!listRaw) return [];
      const ids: string[] = JSON.parse(listRaw);
      return ids
        .map(id => this.getLocalInvoice(id))
        .filter(Boolean) as PaymentInvoice[];
    } catch { return []; }
  }

  // --------------------------------------------------------------------------
  // Format invoice number for display
  // --------------------------------------------------------------------------
  formatNumber(invoice: PaymentInvoice): string {
    return invoice.invoice_number;
  }

  // --------------------------------------------------------------------------
  // Status helpers
  // --------------------------------------------------------------------------
  isTerminal(status: InvoiceStatus): boolean {
    return ['completed', 'failed', 'expired', 'cancelled'].includes(status);
  }

  statusLabel(status: InvoiceStatus): string {
    const labels: Record<InvoiceStatus, string> = {
      pending:    'Awaiting Payment',
      processing: 'Payment Sent',
      completed:  'Activated',
      failed:     'Failed',
      expired:    'Expired',
      cancelled:  'Cancelled',
    };
    return labels[status] ?? status;
  }

  statusColor(status: InvoiceStatus): string {
    const colors: Record<InvoiceStatus, string> = {
      pending:    'text-amber-500',
      processing: 'text-blue-400',
      completed:  'text-emerald-400',
      failed:     'text-red-400',
      expired:    'text-gray-400',
      cancelled:  'text-gray-400',
    };
    return colors[status] ?? 'text-gray-400';
  }
}

export const invoiceService = new InvoiceService();
