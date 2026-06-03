import React from 'react';
import { Check, Clock, AlertCircle, X, ExternalLink, Copy, RefreshCw, Zap } from 'lucide-react';
import { PaymentInvoice, invoiceService, InvoiceStatus } from '../services/invoiceService';
import { getNetworkConfig } from '../constants';

interface Props {
  invoice: PaymentInvoice;
  onClose: () => void;
  onRetry?: () => void;   // re-open purchase modal with same package
  onResume?: () => void;  // re-open modal to resume polling (manual mode)
}

const StatusIcon: React.FC<{ status: InvoiceStatus }> = ({ status }) => {
  if (status === 'completed')
    return <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center"><Check size={28} className="text-emerald-400" /></div>;
  if (status === 'processing')
    return <div className="w-14 h-14 rounded-full bg-blue-500/20 flex items-center justify-center"><RefreshCw size={28} className="text-blue-400 animate-spin" /></div>;
  if (status === 'failed' || status === 'expired')
    return <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center"><AlertCircle size={28} className="text-red-400" /></div>;
  return <div className="w-14 h-14 rounded-full bg-amber-500/20 flex items-center justify-center"><Clock size={28} className="text-amber-400" /></div>;
};

const PaymentInvoiceModal: React.FC<Props> = ({ invoice, onClose, onRetry, onResume }) => {
  const [copied, setCopied] = React.useState<string | null>(null);

  const copy = async (text: string, key: string) => {
    try { await navigator.clipboard.writeText(text); }
    catch { /* fallback */ }
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const tonViewerUrl = invoice.tx_hash
    ? `https://tonviewer.com/transaction/${invoice.tx_hash}`
    : null;

  const isTerminal = invoiceService.isTerminal(invoice.status);
  const canRetry   = invoice.status === 'failed' || invoice.status === 'expired';
  const canResume  = invoice.status === 'pending' && invoice.payment_method === 'manual';

  return (
    <div className="fixed inset-0 z-[600] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 dark:border-white/5">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Payment Receipt</p>
            <p className="text-sm font-black text-gray-900 dark:text-white">{invoice.invoice_number}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
            <X size={16} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Status hero */}
        <div className="flex flex-col items-center py-6 px-5 gap-3">
          <StatusIcon status={invoice.status} />
          <div className="text-center">
            <p className={`text-lg font-black ${invoiceService.statusColor(invoice.status)}`}>
              {invoiceService.statusLabel(invoice.status)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{invoice.package_name}</p>
          </div>
        </div>

        {/* Invoice details */}
        <div className="px-5 pb-5 space-y-3">

          {/* Amounts */}
          <div className="bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/5 rounded-2xl p-4 space-y-2.5">
            <Row label="Total (USD)"  value={`$${invoice.total_usd.toFixed(2)}`} bold />
            <Row label="Total (TON)"  value={`${invoice.total_ton.toFixed(4)} TON`} />
            <Row label="TON Price"    value={`$${invoice.ton_price_usd.toFixed(4)}`} />
            <Row label="RZC Reward"   value={`${invoice.rzc_reward.toLocaleString()} RZC`} />
            {invoice.commission_ton > 0 && (
              <Row label="Referral Commission" value={`${invoice.commission_ton.toFixed(6)} TON`} />
            )}
          </div>

          {/* Payment address */}
          <div className="bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/5 rounded-2xl p-4">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Payment Address</p>
            <div className="flex items-center gap-2">
              <p className="flex-1 font-mono text-xs text-gray-700 dark:text-gray-300 break-all leading-relaxed">
                {invoice.payment_address}
              </p>
              <button onClick={() => copy(invoice.payment_address, 'addr')}
                className="shrink-0 p-1.5 rounded-lg bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 transition-colors">
                {copied === 'addr' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} className="text-gray-400" />}
              </button>
            </div>
          </div>

          {/* TX hash (if available) */}
          {invoice.tx_hash && (
            <div className="bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/5 rounded-2xl p-4">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Transaction Hash</p>
              <div className="flex items-center gap-2">
                <p className="flex-1 font-mono text-xs text-gray-700 dark:text-gray-300 break-all leading-relaxed">
                  {invoice.tx_hash}
                </p>
                <button onClick={() => copy(invoice.tx_hash!, 'hash')}
                  className="shrink-0 p-1.5 rounded-lg bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 transition-colors">
                  {copied === 'hash' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} className="text-gray-400" />}
                </button>
              </div>
              {tonViewerUrl && (
                <a href={tonViewerUrl} target="_blank" rel="noopener noreferrer"
                  className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline">
                  <ExternalLink size={11} /> View on TONViewer
                </a>
              )}
            </div>
          )}

          {/* Error message */}
          {invoice.error_message && (
            <div className="p-3 bg-red-500/10 border-l-4 border-red-500 rounded-r-xl">
              <p className="text-xs text-red-500">{invoice.error_message}</p>
            </div>
          )}

          {/* Timestamps */}
          <div className="flex justify-between text-[10px] text-gray-400 px-1">
            <span>Created: {new Date(invoice.created_at).toLocaleString()}</span>
            {invoice.paid_at && <span>Paid: {new Date(invoice.paid_at).toLocaleString()}</span>}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            {canResume && onResume && (
              <button onClick={onResume}
                className="flex-1 py-3 rounded-2xl bg-blue-500 hover:bg-blue-400 text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors">
                <RefreshCw size={13} /> Resume Payment
              </button>
            )}
            {canRetry && onRetry && (
              <button onClick={onRetry}
                className="flex-1 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors">
                <Zap size={13} /> Try Again
              </button>
            )}
            {isTerminal && !canRetry && (
              <button onClick={onClose}
                className="flex-1 py-3 rounded-2xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 text-xs font-black uppercase tracking-widest transition-colors">
                Close
              </button>
            )}
          </div>

          <p className="text-center text-[10px] text-gray-400 dark:text-gray-600">
            Invoice ID: {invoice.id}
          </p>
        </div>
      </div>
    </div>
  );
};

const Row: React.FC<{ label: string; value: string; bold?: boolean }> = ({ label, value, bold }) => (
  <div className="flex justify-between items-center">
    <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
    <span className={`text-xs ${bold ? 'text-base font-black text-gray-900 dark:text-white' : 'font-bold text-gray-700 dark:text-gray-200'}`}>{value}</span>
  </div>
);

export default PaymentInvoiceModal;
