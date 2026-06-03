import React, { useState, useEffect, useCallback } from 'react';
import {
  Rocket, Search, RefreshCw, CheckCircle, XCircle, Clock,
  Download, ChevronDown, ChevronUp, Eye, X, Save,
  Shield, Users, Wallet, Globe, TrendingUp, AlertCircle, Filter
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { supabaseService } from '../services/supabaseService';

export interface EngagementRecord {
  id: string;
  wallet_address: string;
  full_name: string;
  email: string;
  telegram?: string;
  phone?: string;
  country: string;
  rzc_balance_claim: number;
  rzc_balance_verified: number;
  premining_amount: number;
  hear_about?: string;
  status: 'pending' | 'verified' | 'rejected';
  has_balance_issue?: boolean;
  balance_issue_query?: string | null;
  admin_notes?: string;
  submitted_at: string;
  verified_at?: string;
}

type SortField = 'submitted_at' | 'full_name' | 'rzc_balance_claim' | 'premining_amount' | 'status' | 'country';
type SortDir = 'asc' | 'desc';

const STATUS_CFG = {
  pending:  { icon: Clock,        color: 'amber',   label: 'Pending'  },
  verified: { icon: CheckCircle,  color: 'emerald',  label: 'Verified' },
  rejected: { icon: XCircle,      color: 'red',      label: 'Rejected' },
} as const;

const EngagementRequestsPanel: React.FC = () => {
  const { showToast } = useToast();
  const [records, setRecords] = useState<EngagementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('submitted_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Modal
  const [selected, setSelected] = useState<EngagementRecord | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Stats
  const [stats, setStats] = useState({ total: 0, pending: 0, verified: 0, rejected: 0, totalRzc: 0, totalPremining: 0 });

  const loadRecords = useCallback(async () => {
    try {
      const client = supabaseService.getClient();
      if (!client) throw new Error('Supabase not configured');
      const { data, error } = await client
        .from('mainnet_engagement')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      const rows: EngagementRecord[] = data || [];
      setRecords(rows);
      setStats({
        total:         rows.length,
        pending:       rows.filter(r => r.status === 'pending').length,
        verified:      rows.filter(r => r.status === 'verified').length,
        rejected:      rows.filter(r => r.status === 'rejected').length,
        totalRzc:      rows.reduce((s, r) => s + (r.rzc_balance_claim || 0), 0),
        totalPremining:rows.reduce((s, r) => s + (r.premining_amount || 0), 0),
      });
    } catch (err: any) {
      console.error('EngagementRequestsPanel load error:', err);
      showToast('Failed to load engagement records', 'error');
    }
    setLoading(false);
  }, [showToast]);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRecords();
    setRefreshing(false);
    showToast('Records refreshed', 'success');
  };

  const updateStatus = async (record: EngagementRecord, status: 'verified' | 'rejected') => {
    if (status === 'rejected' && !adminNotes.trim()) {
      showToast('Please provide a rejection reason', 'error');
      return;
    }
    setSaving(true);
    try {
      const client = supabaseService.getClient();
      if (!client) throw new Error('Supabase not configured');
      const { error } = await client
        .from('mainnet_engagement')
        .update({
          status,
          admin_notes: adminNotes || (status === 'verified' ? 'Verified by admin' : undefined),
          verified_at: status === 'verified' ? new Date().toISOString() : null,
        })
        .eq('id', record.id);
      if (error) throw error;
      showToast(`Application ${status === 'verified' ? 'verified ✓' : 'rejected'}`, status === 'verified' ? 'success' : 'error');
      setSelected(null);
      setAdminNotes('');
      await loadRecords();
    } catch (err: any) {
      showToast(err.message || 'Update failed', 'error');
    }
    setSaving(false);
  };

  const exportCSV = () => {
    const header = ['Name','Email','Wallet','Country','RZC Claimed','Pre-Mining RZC','Status','Telegram','Submitted At'];
    const rows = displayed.map(r => [
      r.full_name, r.email, r.wallet_address, r.country,
      r.rzc_balance_claim, r.premining_amount, r.status,
      r.telegram || '', new Date(r.submitted_at).toLocaleDateString()
    ]);
    const csv = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mainnet_engagement_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showToast('CSV exported', 'success');
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  // Derived: filtered + sorted
  const countries = ['all', ...Array.from(new Set(records.map(r => r.country))).sort()];
  const displayed = records
    .filter(r => {
      const q = search.toLowerCase();
      const matchSearch = !q || r.full_name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q) || r.wallet_address.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || r.status === statusFilter;
      const matchCountry = countryFilter === 'all' || r.country === countryFilter;
      return matchSearch && matchStatus && matchCountry;
    })
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'submitted_at') return dir * (new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime());
      if (sortField === 'full_name') return dir * a.full_name.localeCompare(b.full_name);
      if (sortField === 'rzc_balance_claim') return dir * (a.rzc_balance_claim - b.rzc_balance_claim);
      if (sortField === 'premining_amount') return dir * (a.premining_amount - b.premining_amount);
      if (sortField === 'status') return dir * a.status.localeCompare(b.status);
      if (sortField === 'country') return dir * a.country.localeCompare(b.country);
      return 0;
    });

  const SortBtn: React.FC<{ field: SortField; children: React.ReactNode }> = ({ field, children }) => (
    <button onClick={() => toggleSort(field)} className="flex items-center gap-1 hover:text-blue-600 transition-colors">
      {children}
      {sortField === field ? (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ChevronDown size={12} className="opacity-30" />}
    </button>
  );

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <RefreshCw size={24} className="animate-spin text-emerald-500" />
    </div>
  );

  return (
    <div className="space-y-5">

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total',       value: stats.total,                                       color: 'slate',   icon: Users      },
          { label: 'Pending',     value: stats.pending,                                     color: 'amber',   icon: Clock      },
          { label: 'Verified',    value: stats.verified,                                    color: 'emerald', icon: CheckCircle},
          { label: 'Rejected',    value: stats.rejected,                                    color: 'red',     icon: XCircle    },
          { label: 'Total RZC',   value: `${(stats.totalRzc/1000).toFixed(1)}K`,            color: 'blue',    icon: Wallet     },
          { label: 'Pre-Mined',   value: `${(stats.totalPremining/1000).toFixed(1)}K`,      color: 'purple',  icon: TrendingUp },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className={`p-3 rounded-xl bg-${color}-50 dark:bg-${color}-500/10 border border-${color}-200 dark:border-${color}-500/20`}>
            <Icon size={14} className={`text-${color}-600 dark:text-${color}-400 mb-1`} />
            <div className={`text-lg font-black text-${color}-800 dark:text-${color}-200 font-numbers`}>{value}</div>
            <div className={`text-[9px] font-black uppercase tracking-widest text-${color}-500/70`}>{label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search name, email or wallet..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm outline-none focus:border-blue-500/50 transition-all"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm outline-none text-slate-700 dark:text-gray-300"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            value={countryFilter}
            onChange={e => setCountryFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm outline-none text-slate-700 dark:text-gray-300"
          >
            {countries.map(c => <option key={c} value={c}>{c === 'all' ? 'All Countries' : c}</option>)}
          </select>
          <button onClick={handleRefresh} disabled={refreshing} className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors">
            <RefreshCw size={14} className={refreshing ? 'animate-spin text-emerald-500' : 'text-slate-500'} />
          </button>
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-black hover:bg-emerald-700 transition-all active:scale-95 shadow-md shadow-emerald-600/20">
            <Download size={13} /> CSV
          </button>
        </div>
      </div>

      {/* Count */}
      <p className="text-xs text-slate-500 dark:text-gray-500 font-semibold">
        Showing <span className="font-black text-slate-700 dark:text-gray-200">{displayed.length}</span> of {records.length} submissions
      </p>

      {/* Table */}
      <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
                <th className="px-4 py-3 text-left font-black text-slate-500 dark:text-gray-500 uppercase tracking-widest">
                  <SortBtn field="full_name">Applicant</SortBtn>
                </th>
                <th className="px-4 py-3 text-left font-black text-slate-500 dark:text-gray-500 uppercase tracking-widest">
                  <SortBtn field="country">Country</SortBtn>
                </th>
                <th className="px-4 py-3 text-right font-black text-slate-500 dark:text-gray-500 uppercase tracking-widest">
                  <SortBtn field="rzc_balance_claim">RZC Claimed</SortBtn>
                </th>
                <th className="px-4 py-3 text-right font-black text-slate-500 dark:text-gray-500 uppercase tracking-widest">
                  <SortBtn field="premining_amount">Pre-Mined</SortBtn>
                </th>
                <th className="px-4 py-3 text-left font-black text-slate-500 dark:text-gray-500 uppercase tracking-widest">
                  <SortBtn field="status">Status</SortBtn>
                </th>
                <th className="px-4 py-3 text-left font-black text-slate-500 dark:text-gray-500 uppercase tracking-widest">
                  <SortBtn field="submitted_at">Submitted</SortBtn>
                </th>
                <th className="px-4 py-3 text-center font-black text-slate-500 dark:text-gray-500 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {displayed.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400 dark:text-gray-600">
                    <Rocket size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="font-semibold">No submissions found</p>
                  </td>
                </tr>
              ) : displayed.map(r => {
                const cfg = STATUS_CFG[r.status];
                const StatusIcon = cfg.icon;
                return (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-900 dark:text-white">{r.full_name}</p>
                      <p className="text-[10px] text-slate-400 dark:text-gray-600 font-mono mt-0.5 truncate max-w-[140px]">{r.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-slate-600 dark:text-gray-300 font-semibold">
                        <Globe size={11} className="text-slate-400" /> {r.country}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-black text-slate-800 dark:text-white font-numbers">
                      {(r.rzc_balance_claim || 0).toLocaleString()}
                      <span className="text-[9px] font-bold text-slate-400 ml-1">RZC</span>
                    </td>
                    <td className="px-4 py-3 text-right font-black text-purple-700 dark:text-purple-300 font-numbers">
                      {(r.premining_amount || 0).toLocaleString()}
                      <span className="text-[9px] font-bold text-purple-400 ml-1">RZC</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider
                        bg-${cfg.color}-100 dark:bg-${cfg.color}-500/15 text-${cfg.color}-700 dark:text-${cfg.color}-300`}>
                        <StatusIcon size={10} />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-gray-500 font-semibold">
                      {new Date(r.submitted_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => { setSelected(r); setAdminNotes(r.admin_notes || ''); }}
                        className="p-2 rounded-lg bg-slate-100 dark:bg-white/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-slate-500 hover:text-blue-600 transition-colors"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selected && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setSelected(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-white/10">
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-base">{selected.full_name}</h3>
                  <p className="text-xs text-slate-500 dark:text-gray-500">{selected.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {(() => { const cfg = STATUS_CFG[selected.status]; const Icon = cfg.icon; return (
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-${cfg.color}-100 dark:bg-${cfg.color}-500/15 text-${cfg.color}-700 dark:text-${cfg.color}-300`}>
                      <Icon size={11} /> {cfg.label}
                    </span>
                  ); })()}
                  <button onClick={() => setSelected(null)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-slate-500">
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-4">
                {/* Wallet */}
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1">
                    <Shield size={10} /> Wallet Address
                  </p>
                  <p className="text-xs font-mono text-slate-800 dark:text-gray-200 break-all">{selected.wallet_address}</p>
                </div>

                {/* Key Details */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Country',       value: selected.country },
                    { label: 'Telegram',      value: selected.telegram || '—' },
                    { label: 'Phone',         value: selected.phone    || '—' },
                    { label: 'Heard via',     value: selected.hear_about || '—' },
                    { label: 'Submitted',     value: new Date(selected.submitted_at).toLocaleString() },
                    { label: 'Verified At',   value: selected.verified_at ? new Date(selected.verified_at).toLocaleString() : '—' },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-gray-600 mb-0.5">{label}</p>
                      <p className="text-xs font-semibold text-slate-700 dark:text-gray-300">{value}</p>
                    </div>
                  ))}
                </div>

                {/* Balances */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
                    <p className="text-[9px] font-black uppercase tracking-widest text-blue-500 mb-1">RZC Balance Claimed</p>
                    <p className="text-xl font-black text-blue-800 dark:text-blue-200 font-numbers">{(selected.rzc_balance_claim || 0).toLocaleString()}</p>
                    <p className="text-[10px] text-blue-400">RZC</p>
                  </div>
                  <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20">
                    <p className="text-[9px] font-black uppercase tracking-widest text-purple-500 mb-1">⛏️ Pre-Mining RZC</p>
                    <p className="text-xl font-black text-purple-800 dark:text-purple-200 font-numbers">{(selected.premining_amount || 0).toLocaleString()}</p>
                    <p className="text-[10px] text-purple-400">RZC</p>
                  </div>
                </div>

                {/* Balance Issue */}
                {selected.has_balance_issue && (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-1 flex items-center gap-1">
                      <AlertCircle size={10} /> Reported Balance Issue
                    </p>
                    <p className="text-xs text-amber-800 dark:text-amber-200 whitespace-pre-wrap">{selected.balance_issue_query}</p>
                  </div>
                )}

                {/* Admin Notes */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-500 dark:text-gray-500 mb-2">
                    Admin Notes {selected.status === 'rejected' && <span className="text-red-500">(required for rejection)</span>}
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={e => setAdminNotes(e.target.value)}
                    rows={3}
                    placeholder="Add notes about this application..."
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500/50 transition-all resize-none"
                  />
                </div>

                {/* Existing admin notes read-only if already set */}
                {selected.admin_notes && selected.admin_notes !== adminNotes && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Previous Admin Note</p>
                    <p className="text-xs text-slate-600 dark:text-gray-400">{selected.admin_notes}</p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-5 border-t border-slate-200 dark:border-white/10 flex gap-3">
                {selected.status !== 'verified' && (
                  <button
                    onClick={() => updateStatus(selected, 'verified')}
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 text-white text-sm font-black hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-60 shadow-lg shadow-emerald-600/20"
                  >
                    {saving ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                    Verify & Approve
                  </button>
                )}
                {selected.status !== 'rejected' && (
                  <button
                    onClick={() => updateStatus(selected, 'rejected')}
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-600 text-white text-sm font-black hover:bg-red-700 transition-all active:scale-95 disabled:opacity-60 shadow-lg shadow-red-600/20"
                  >
                    {saving ? <RefreshCw size={14} className="animate-spin" /> : <XCircle size={14} />}
                    Reject
                  </button>
                )}
                <button
                  onClick={() => setSelected(null)}
                  className="px-4 py-3 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-gray-300 text-sm font-bold hover:bg-slate-200 dark:hover:bg-white/20 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default EngagementRequestsPanel;
