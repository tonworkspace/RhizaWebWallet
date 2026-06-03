import React, { useState } from 'react';
import { Search, FileText, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { invoiceService, PaymentInvoice } from '../services/invoiceService';
import { useWallet } from '../context/WalletContext';
import PaymentInvoiceModal from '../components/PaymentInvoiceModal';

const InvoiceLookup: React.FC = () => {
  const navigate = useNavigate();
  const { address } = useWallet();
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [myInvoices, setMyInvoices] = useState<PaymentInvoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<PaymentInvoice | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load user's invoices on mount
  React.useEffect(() => {
    const loadInvoices = async () => {
      if (!address) return;
      const invoices = await invoiceService.getWalletInvoices(address);
      setMyInvoices(invoices);
    };
    loadInvoices();
  }, [address]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setError(null);

    try {
      const invoice = await invoiceService.getInvoiceByNumber(searchQuery.trim().toUpperCase());
      if (invoice) {
        setSelectedInvoice(invoice);
      } else {
        setError('Invoice not found. Please check the invoice number and try again.');
      }
    } catch (err) {
      setError('Failed to search invoice. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#050505] text-gray-900 dark:text-white">
      {/* Header */}
      <header className="bg-white dark:bg-black/20 border-b border-gray-200 dark:border-white/5 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black">Payment Invoices</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Track your payment status</p>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Search */}
        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/5 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={20} className="text-emerald-500" />
            <h2 className="text-lg font-black">Find Invoice</h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Enter your invoice number (e.g., INV-20260411-XXXX) to check payment status
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="INV-20260411-XXXX"
              className="flex-1 px-4 py-3 rounded-xl bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              onClick={handleSearch}
              disabled={searching || !searchQuery.trim()}
              className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold flex items-center gap-2 transition-colors"
            >
              <Search size={16} />
              {searching ? 'Searching...' : 'Search'}
            </button>
          </div>
          {error && (
            <p className="mt-3 text-sm text-red-500">{error}</p>
          )}
        </div>

        {/* My Invoices */}
        {address && myInvoices.length > 0 && (
          <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/5 rounded-2xl p-6">
            <h2 className="text-lg font-black mb-4">My Recent Invoices</h2>
            <div className="space-y-2">
              {myInvoices.map((invoice) => (
                <button
                  key={invoice.id}
                  onClick={() => setSelectedInvoice(invoice)}
                  className="w-full flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 hover:border-emerald-500/50 transition-colors text-left"
                >
                  <div className="flex-1">
                    <p className="font-mono text-sm font-bold text-gray-900 dark:text-white">
                      {invoice.invoice_number}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {invoice.package_name} • {invoice.total_ton.toFixed(4)} TON
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs font-bold ${invoiceService.statusColor(invoice.status)}`}>
                      {invoiceService.statusLabel(invoice.status)}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {new Date(invoice.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {address && myInvoices.length === 0 && (
          <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/5 rounded-2xl p-12 text-center">
            <FileText size={48} className="mx-auto text-gray-300 dark:text-gray-700 mb-4" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No invoices found for your wallet
            </p>
          </div>
        )}
      </div>

      {/* Invoice Modal */}
      {selectedInvoice && (
        <PaymentInvoiceModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
};

export default InvoiceLookup;
