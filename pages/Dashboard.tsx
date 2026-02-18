
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { 
  Send, 
  Download, 
  RefreshCw,
  TrendingUp,
  Copy,
  ShieldCheck,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { MOCK_PORTFOLIO_HISTORY } from '../constants';
import { useWallet } from '../context/WalletContext';

const ActionButton = ({ icon: Icon, label, to, primary = false }: { icon: any, label: string, to: string, primary?: boolean }) => (
  <Link to={to} className={`
    flex flex-col items-center gap-3 p-6 rounded-[2rem] transition-all duration-300 flex-1
    ${primary 
      ? 'bg-[#00FF88] text-black hover:bg-[#00e67a] shadow-[0_0_30px_rgba(0,255,136,0.15)] active:scale-95' 
      : 'luxury-card text-white hover:bg-white/10 active:scale-95'}
  `}>
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${primary ? 'bg-black/10' : 'bg-white/5'}`}>
      <Icon size={22} />
    </div>
    <span className="text-[9px] font-black uppercase tracking-[0.2em]">{label}</span>
  </Link>
);

const Dashboard: React.FC = () => {
  const { balance, address, refreshData, jettons, profile, isRateLimited } = useWallet();

  useEffect(() => {
    refreshData();
  }, []);

  const shortenAddress = (addr: string | null) => {
    if (!addr) return '...';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleCopy = () => {
    if (address) navigator.clipboard.writeText(address);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      
      {/* Rate Limit Warning */}
      {isRateLimited && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-4 text-amber-500 animate-in slide-in-from-top-4">
          <AlertTriangle size={24} className="shrink-0" />
          <div className="text-xs">
            <p className="font-black uppercase tracking-widest mb-1">Network Congestion (429)</p>
            <p className="font-medium opacity-80 leading-relaxed">Public TON nodes are under heavy load. Balances may be slightly out of sync. Retrying automatically...</p>
          </div>
        </div>
      )}

      {/* Greeting Section */}
      <div className="flex items-center justify-between px-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{profile.avatar}</span>
            <h1 className="text-3xl font-black text-white tracking-tight-custom">Welcome, {profile.name}</h1>
          </div>
          <p className="text-gray-500 text-xs font-medium">Your terminal is online and secured.</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-[#00FF88]/10 border border-[#00FF88]/20 flex items-center justify-center text-[#00FF88] animate-pulse">
          <Sparkles size={20} />
        </div>
      </div>

      {/* Portfolio Card - Luxury High Contrast */}
      <div className="relative p-10 rounded-[3rem] bg-[#0a0a0a] ring-1 ring-white/10 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-[#00FF88]/10 via-transparent to-transparent blur-[120px] rounded-full" />
        
        <div className="relative z-10 flex flex-col items-center text-center space-y-6">
          <div onClick={handleCopy} className="flex items-center gap-3 bg-white/5 px-4 py-1.5 rounded-full border border-white/5 group cursor-pointer hover:bg-white/10 transition-all">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest font-mono">{shortenAddress(address)}</span>
            <Copy size={12} className="text-gray-700 group-hover:text-[#00FF88]" />
          </div>
          
          <div className="space-y-2">
            <p className="text-[10px] font-black text-gray-600 uppercase tracking-[0.4em]">TON Balance</p>
            <h2 className="text-6xl font-black tracking-tight-custom text-white">
              {balance} <span className="text-xl text-[#00FF88]">TON</span>
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#00FF88]/10 text-[#00FF88] text-[10px] font-black uppercase tracking-[0.2em]">
              <TrendingUp size={12} /> Network Live
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]">
              <ShieldCheck size={12} /> Verified Vault
            </div>
          </div>
        </div>

        {/* Chart Integrated Sleekly */}
        <div className="h-32 w-full mt-12 -mb-6 opacity-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={MOCK_PORTFOLIO_HISTORY}>
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00FF88" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#00FF88" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#00FF88" 
                strokeWidth={4}
                fillOpacity={1} 
                fill="url(#chartGradient)" 
                animationDuration={2000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Unified Action Grid */}
      <div className="flex gap-4">
        <ActionButton icon={Send} label="Transfer" to="/wallet/transfer" primary />
        <ActionButton icon={Download} label="Receive" to="/wallet/receive" />
        <ActionButton icon={RefreshCw} label="Swap" to="/wallet/assets" />
      </div>

      {/* Jettons List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600">Your Tokens</h3>
          <button className="text-[9px] font-black text-[#00FF88] tracking-widest hover:opacity-70 transition-opacity" onClick={() => refreshData()}>
            REFRESH DATA
          </button>
        </div>
        <div className="glass rounded-[2.5rem] overflow-hidden divide-y divide-white/5">
          {jettons.length > 0 ? jettons.map((j: any, i: number) => (
            <div key={i} className="p-6 flex items-center justify-between hover:bg-white/5 transition-all cursor-pointer group">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl bg-white/5 border border-white/5 group-hover:border-[#00FF88]/30 transition-all overflow-hidden">
                  {j.jetton.image ? <img src={j.jetton.image} className="w-full h-full object-cover" /> : '💎'}
                </div>
                <div>
                  <h4 className="font-black text-sm text-white">{j.jetton.name}</h4>
                  <p className="text-[10px] text-gray-500 font-bold tracking-tight uppercase mt-0.5">{(Number(j.balance) / Math.pow(10, j.jetton.decimals)).toFixed(2)} {j.jetton.symbol}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-emerald-500 font-black mt-0.5">Verified</div>
              </div>
            </div>
          )) : (
            <div className="p-12 text-center text-gray-600 font-black text-[10px] uppercase tracking-widest">
              No Jettons found in this vault.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
