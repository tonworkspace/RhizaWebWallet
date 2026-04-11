import React, { useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { supabaseService } from '../services/supabaseService';
import {
  CheckCircle, XCircle, Loader, Play, RotateCcw,
  ChevronDown, ChevronUp, AlertTriangle, Zap, Database, Wallet
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = 'idle' | 'running' | 'pass' | 'fail' | 'warn';

interface TestResult {
  name: string;
  status: Status;
  detail: string;
  raw?: any;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const badge = (s: Status) => {
  const map: Record<Status, string> = {
    idle:    'bg-gray-500/20 text-gray-400',
    running: 'bg-blue-500/20 text-blue-400',
    pass:    'bg-emerald-500/20 text-emerald-400',
    fail:    'bg-red-500/20 text-red-400',
    warn:    'bg-amber-500/20 text-amber-400',
  };
  return map[s];
};

const Icon = ({ s }: { s: Status }) => {
  if (s === 'running') return <Loader size={14} className="animate-spin text-blue-400" />;
  if (s === 'pass')    return <CheckCircle size={14} className="text-emerald-400" />;
  if (s === 'fail')    return <XCircle size={14} className="text-red-400" />;
  if (s === 'warn')    return <AlertTriangle size={14} className="text-amber-400" />;
  return <div className="w-3.5 h-3.5 rounded-full border border-gray-600" />;
};

// ─── Component ────────────────────────────────────────────────────────────────

const ActivationTest: React.FC = () => {
  const { address, network } = useWallet();
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [customAddress, setCustomAddress] = useState('');
  const [manualTxHash, setManualTxHash] = useState('');

  const update = (name: string, status: Status, detail: string, raw?: any) =>
    setResults(prev => {
      const next = [...prev];
      const i = next.findIndex(r => r.name === name);
      const entry = { name, status, detail, raw };
      if (i >= 0) next[i] = entry; else next.push(entry);
      return next;
    });

  const testAddress = customAddress.trim() || address || '';

  // ── Individual tests ────────────────────────────────────────────────────────

  const testSupabaseConnection = async () => {
    const name = '1. Supabase connection';
    update(name, 'running', 'Pinging Supabase…');
    try {
      const client = supabaseService.getClient();
      if (!client) throw new Error('Client is null — check VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');
      // Lightweight ping: fetch 1 row from wallet_users
      const { error } = await client.from('wallet_users').select('id').limit(1);
      if (error) throw error;
      update(name, 'pass', 'Connected to Supabase successfully');
    } catch (e: any) {
      update(name, 'fail', e.message, e);
    }
  };

  const testProfileLookup = async () => {
    const name = '2. Profile lookup (all address formats)';
    update(name, 'running', `Looking up profile for ${testAddress}`);
    if (!testAddress) { update(name, 'fail', 'No wallet address — connect wallet or enter one above'); return; }
    try {
      const res = await supabaseService.getProfile(testAddress);
      if (!res.success) throw new Error(res.error || 'getProfile returned success=false');
      if (!res.data) {
        update(name, 'warn', 'Profile not found in DB — user may not have registered yet', res);
        return;
      }
      update(name, 'pass', `Found: id=${res.data.id} | is_activated=${res.data.is_activated}`, res.data);
    } catch (e: any) {
      update(name, 'fail', e.message, e);
    }
  };

  const testCheckActivation = async () => {
    const name = '3. check_wallet_activation RPC';
    update(name, 'running', 'Calling check_wallet_activation…');
    if (!testAddress) { update(name, 'fail', 'No wallet address'); return; }
    try {
      const res = await supabaseService.checkWalletActivation(testAddress);
      if (res === null) {
        update(name, 'warn', 'RPC returned null — Supabase may be unreachable or function missing', res);
        return;
      }
      const detail = `is_activated=${res.is_activated} | activated_at=${res.activated_at ?? 'null'} | fee_paid=${res.activation_fee_paid}`;
      update(name, res.is_activated ? 'pass' : 'warn', detail, res);
    } catch (e: any) {
      update(name, 'fail', e.message, e);
    }
  };

  const testAddressVariants = async () => {
    const name = '4. Address format variants';
    update(name, 'running', 'Testing EQ / UQ / kQ variants…');
    if (!testAddress) { update(name, 'fail', 'No wallet address'); return; }
    try {
      const { Address } = await import('@ton/ton');
      const parsed = Address.parse(testAddress);
      const variants = {
        raw:  parsed.toRawString(),
        EQ:   parsed.toString({ bounceable: true,  testOnly: false }),
        UQ:   parsed.toString({ bounceable: false, testOnly: false }),
        kQ:   parsed.toString({ bounceable: false, testOnly: true  }),
      };

      const client = supabaseService.getClient()!;
      const hits: string[] = [];
      for (const [label, addr] of Object.entries(variants)) {
        const { data } = await client.from('wallet_users').select('id, wallet_address, is_activated').eq('wallet_address', addr).maybeSingle();
        if (data) hits.push(`${label} (${addr.slice(0, 10)}…) → FOUND id=${data.id}`);
        else       hits.push(`${label} (${addr.slice(0, 10)}…) → not found`);
      }

      const anyFound = hits.some(h => h.includes('FOUND'));
      update(name, anyFound ? 'pass' : 'warn', hits.join('\n'), variants);
    } catch (e: any) {
      update(name, 'fail', e.message, e);
    }
  };

  const testActivateWalletRpc = async () => {
    const name = '5. activate_wallet RPC (dry-run)';
    update(name, 'running', 'Calling activate_wallet with a fake tx hash…');
    if (!testAddress) { update(name, 'fail', 'No wallet address'); return; }

    // First check if already activated — if so, the new idempotent function returns TRUE
    const activation = await supabaseService.checkWalletActivation(testAddress);
    if (activation?.is_activated) {
      update(name, 'warn', 'Wallet already activated — skipping to avoid double-record. RPC is reachable.', activation);
      return;
    }

    try {
      const fakeTxHash = `TEST_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const result = await supabaseService.activateWallet(testAddress, {
        activation_fee_usd: 18,
        activation_fee_ton: 0.001, // tiny amount for test
        ton_price: 2.45,
        transaction_hash: fakeTxHash,
      });
      update(name, result ? 'pass' : 'fail',
        result
          ? `✅ activate_wallet returned TRUE — wallet activated. tx=${fakeTxHash}`
          : '❌ activate_wallet returned FALSE',
        { result, fakeTxHash }
      );
    } catch (e: any) {
      // Parse the Supabase error for actionable hints
      const msg: string = e.message || String(e);
      let hint = '';
      if (msg.includes('500') || msg.includes('Internal'))
        hint = ' → Likely address format mismatch. Run fix_activate_wallet_500.sql in Supabase.';
      else if (msg.includes('Wallet not found'))
        hint = ' → Profile not in DB for this address. Register first.';
      else if (msg.includes('already activated'))
        hint = ' → Already activated (idempotent guard). This is fine.';
      update(name, 'fail', msg + hint, e);
    }
  };

  const testManualActivation = async () => {
    const name = '6. Manual activation (with real tx hash)';
    update(name, 'running', 'Activating with provided tx hash…');
    if (!testAddress) { update(name, 'fail', 'No wallet address'); return; }
    if (!manualTxHash.trim()) { update(name, 'fail', 'Enter a real tx hash in the field above'); return; }

    try {
      const result = await supabaseService.activateWallet(testAddress, {
        activation_fee_usd: 18,
        activation_fee_ton: parseFloat((18 / 2.45).toFixed(4)),
        ton_price: 2.45,
        transaction_hash: manualTxHash.trim(),
      });
      update(name, result ? 'pass' : 'fail',
        result ? `✅ Wallet activated with tx=${manualTxHash}` : '❌ Returned FALSE',
        { result }
      );
    } catch (e: any) {
      update(name, 'fail', e.message, e);
    }
  };

  const testAwardRzc = async () => {
    const name = '7. awardRZCTokens';
    update(name, 'running', 'Fetching profile then awarding 1 RZC…');
    if (!testAddress) { update(name, 'fail', 'No wallet address'); return; }
    try {
      const profileRes = await supabaseService.getProfile(testAddress);
      if (!profileRes.success || !profileRes.data) throw new Error('Profile not found');
      const userId = profileRes.data.id;
      const res = await supabaseService.awardRZCTokens(
        userId, 1, 'activation_bonus', 'Activation test award', { test: true }
      );
      update(name, res.success ? 'pass' : 'fail',
        res.success ? `✅ Awarded 1 RZC. New balance: ${res.newBalance}` : `❌ ${res.error}`,
        res
      );
    } catch (e: any) {
      update(name, 'fail', e.message, e);
    }
  };

  // ── Run all ─────────────────────────────────────────────────────────────────

  const runAll = async () => {
    setRunning(true);
    setResults([]);
    await testSupabaseConnection();
    await testProfileLookup();
    await testCheckActivation();
    await testAddressVariants();
    await testActivateWalletRpc();
    await testAwardRzc();
    setRunning(false);
  };

  const summary = {
    pass: results.filter(r => r.status === 'pass').length,
    fail: results.filter(r => r.status === 'fail').length,
    warn: results.filter(r => r.status === 'warn').length,
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 sm:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <Zap size={18} className="text-emerald-400" />
          </div>
          <h1 className="text-xl font-black tracking-tight">Activation System Tests</h1>
        </div>
        <p className="text-xs text-gray-500 ml-12">Diagnoses the full activation pipeline end-to-end</p>
      </div>

      {/* Config */}
      <div className="mb-4 space-y-2">
        <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10">
          <Wallet size={14} className="text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder={address ? `Connected: ${address.slice(0, 12)}… (or enter another)` : 'Enter wallet address to test'}
            value={customAddress}
            onChange={e => setCustomAddress(e.target.value)}
            className="flex-1 bg-transparent text-xs text-white placeholder-gray-600 outline-none font-mono"
          />
        </div>
        <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10">
          <Database size={14} className="text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Real tx hash for test #6 (optional)"
            value={manualTxHash}
            onChange={e => setManualTxHash(e.target.value)}
            className="flex-1 bg-transparent text-xs text-white placeholder-gray-600 outline-none font-mono"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={runAll}
          disabled={running}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black text-sm uppercase tracking-widest transition-colors"
        >
          {running ? <Loader size={16} className="animate-spin" /> : <Play size={16} />}
          {running ? 'Running…' : 'Run All Tests'}
        </button>
        <button
          onClick={() => setResults([])}
          disabled={running}
          className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 transition-colors"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {/* Summary bar */}
      {results.length > 0 && (
        <div className="flex gap-3 mb-4 p-3 rounded-xl bg-white/[0.03] border border-white/5 text-xs font-bold">
          <span className="text-emerald-400">{summary.pass} passed</span>
          <span className="text-gray-600">·</span>
          <span className="text-red-400">{summary.fail} failed</span>
          <span className="text-gray-600">·</span>
          <span className="text-amber-400">{summary.warn} warnings</span>
        </div>
      )}

      {/* Results */}
      <div className="space-y-2">
        {results.map(r => (
          <div key={r.name} className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden">
            <button
              className="w-full flex items-center gap-3 p-4 text-left"
              onClick={() => setExpanded(expanded === r.name ? null : r.name)}
            >
              <Icon s={r.status} />
              <span className="flex-1 text-sm font-semibold text-white">{r.name}</span>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${badge(r.status)}`}>
                {r.status}
              </span>
              {r.raw !== undefined
                ? (expanded === r.name ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />)
                : null
              }
            </button>

            {/* Detail */}
            <div className="px-4 pb-3 -mt-1">
              <p className="text-xs text-gray-400 whitespace-pre-wrap leading-relaxed">{r.detail}</p>
            </div>

            {/* Raw JSON */}
            {expanded === r.name && r.raw !== undefined && (
              <div className="mx-4 mb-4 p-3 rounded-lg bg-black/40 border border-white/5">
                <pre className="text-[10px] text-gray-400 overflow-x-auto whitespace-pre-wrap break-all">
                  {JSON.stringify(r.raw, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Manual activation shortcut */}
      {results.length > 0 && summary.fail === 0 && (
        <div className="mt-4">
          <button
            onClick={testManualActivation}
            disabled={running || !manualTxHash.trim()}
            className="w-full py-3 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-300 text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Run Test #6 — Activate with real tx hash
          </button>
        </div>
      )}

      {/* Fix hint */}
      {summary.fail > 0 && (
        <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 leading-relaxed">
          <p className="font-bold mb-1">Failures detected</p>
          <p>If test #5 fails with a 500 error, run <code className="bg-black/40 px-1 rounded">fix_activate_wallet_500.sql</code> in your Supabase SQL Editor, then re-run tests.</p>
        </div>
      )}
    </div>
  );
};

export default ActivationTest;
