import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Shield, Bell, Globe, Moon, Sun, Key, Trash2, LogOut,
  ChevronRight, Copy, Check, AlertCircle, Wallet, Lock,
  Edit, Cloud, Layers, ChevronDown, Zap, HelpCircle,
  FileText, Info, RefreshCw, Link2
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { useToast } from '../context/ToastContext';
import { useSettingsModal } from '../context/SettingsModalContext';
import LanguageSelector from '../components/LanguageSelector';
import WalletSwitcher from '../components/WalletSwitcher';
import { WalletManager } from '../utils/walletManager';
import { twoFactorService } from '../services/twoFactorService';
import { cloudBackupService } from '../services/cloudBackupService';
import { type EvmChain } from '../services/tetherWdkService';
import { supabaseService } from '../services/supabaseService';

const EVM_CHAINS: { id: EvmChain; label: string; dot: string }[] = [
  { id: 'ethereum',  label: 'Ethereum',  dot: 'bg-blue-400' },
  { id: 'polygon',   label: 'Polygon',   dot: 'bg-violet-400' },
  { id: 'arbitrum',  label: 'Arbitrum',  dot: 'bg-sky-400' },
  { id: 'bsc',       label: 'BNB Chain', dot: 'bg-yellow-400' },
  { id: 'avalanche', label: 'Avalanche', dot: 'bg-red-400' },
];

// ─── Section label ────────────────────────────────────────────────────────────
const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[10px] font-heading font-black uppercase tracking-widest text-gray-500 dark:text-gray-500 px-1 mb-2">
    {children}
  </p>
);

// ─── Card shell — matches app-wide card style ─────────────────────────────────
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white dark:bg-white/5 border-2 border-gray-200 dark:border-white/5 rounded-2xl shadow-sm overflow-hidden ${className}`}>
    {children}
  </div>
);

// ─── Row inside a card ────────────────────────────────────────────────────────
interface RowProps {
  icon: React.ElementType;
  iconColor?: string;   // tailwind bg+text classes for the icon bubble
  label: string;
  sub?: React.ReactNode;
  right?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
  noBorder?: boolean;
}

const Row: React.FC<RowProps> = ({ icon: Icon, iconColor, label, sub, right, onClick, danger, noBorder }) => (
  <div
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    onClick={onClick}
    onKeyDown={e => onClick && e.key === 'Enter' && onClick()}
    className={[
      'flex items-center gap-3 px-4 py-3.5 transition-colors',
      !noBorder && 'border-b border-gray-100 dark:border-white/5 last:border-0',
      onClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 active:bg-gray-100 dark:active:bg-white/8' : '',
      danger ? 'text-red-500 dark:text-red-400' : '',
    ].filter(Boolean).join(' ')}
  >
    {/* Icon bubble */}
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
      danger
        ? 'bg-red-100 dark:bg-red-500/10 text-red-500 dark:text-red-400'
        : iconColor ?? 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400'
    }`}>
      <Icon size={16} />
    </div>

    {/* Text */}
    <div className="flex-1 min-w-0">
      <p className={`text-sm font-heading font-black uppercase tracking-widest leading-tight ${danger ? '' : 'text-gray-900 dark:text-white'}`}>
        {label}
      </p>
      {sub && (
        <p className="text-[10px] font-body text-gray-500 dark:text-gray-500 mt-1 truncate">{sub}</p>
      )}
    </div>

    {/* Right slot */}
    {right !== undefined
      ? <div className="flex-shrink-0">{right}</div>
      : onClick && <ChevronRight size={15} className="text-gray-400 dark:text-gray-600 flex-shrink-0" />}
  </div>
);

// ─── Status badge ─────────────────────────────────────────────────────────────
const Badge: React.FC<{ on: boolean; onLabel?: string; offLabel?: string }> = ({
  on, onLabel = 'On', offLabel = 'Off',
}) => (
  <span className={`px-2 py-0.5 rounded-full text-[9px] font-heading font-black uppercase tracking-widest ${
    on
      ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
      : 'bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-500'
  }`}>
    {on ? onLabel : offLabel}
  </span>
);

// ─── Toggle switch ────────────────────────────────────────────────────────────
const Toggle: React.FC<{ on: boolean }> = ({ on }) => (
  <div className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${on ? 'bg-emerald-500 dark:bg-[#00FF88]' : 'bg-gray-300 dark:bg-white/15'}`}>
    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${on ? 'translate-x-5' : 'translate-x-0.5'}`} />
  </div>
);

// ─── Main ─────────────────────────────────────────────────────────────────────
const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const {
    address, userProfile, theme, toggleTheme,
    network, switchNetwork, switchEvmChain, currentEvmChain,
    isActivated, activatedAt, activationFeePaid,
  } = useWallet();
  const { showToast } = useToast();
  const { openExportModal, setShowLogoutConfirm, setShowDeleteConfirm } = useSettingsModal();

  const [addressCopied, setAddressCopied]       = useState(false);
  const [is2faEnabled, setIs2faEnabled]         = useState<boolean | null>(null);
  const [hasCloudBackup, setHasCloudBackup]     = useState<boolean | null>(null);
  const [activeWalletType, setActiveWalletType] = useState<'primary' | 'secondary'>('primary');
  const [evmOpen, setEvmOpen]                   = useState(false);
  const [showAddressMigration, setShowAddressMigration] = useState(false);
  const [hasOldActivation, setHasOldActivation] = useState(false);

  useEffect(() => {
    const active = WalletManager.getActiveWallet();
    if (active?.type) setActiveWalletType(active.type);
  }, []);

  // Check if old EQ address has an activation record (for the migration row badge)
  useEffect(() => {
    if (!address) return;
    const check = async () => {
      try {
        const { Address } = await import('@ton/ton');
        const eqAddress = Address.parse(address).toString({ bounceable: true, testOnly: false });
        if (eqAddress === address) return; // already EQ, no migration needed
        const client = supabaseService.getClient();
        if (!client) return;
        const { data } = await client
          .from('wallet_activations')
          .select('id')
          .eq('wallet_address', eqAddress)
          .eq('status', 'completed')
          .limit(1)
          .maybeSingle();
        setHasOldActivation(!!data);
      } catch { /* non-fatal */ }
    };
    check();
  }, [address]);

  useEffect(() => {
    if (!address) return;
    twoFactorService.get2FAStatus(address).then(({ enabled }) => setIs2faEnabled(enabled));
  }, [address]);

  useEffect(() => {
    if (!address || !userProfile?.id) return;
    cloudBackupService.listBackups(userProfile.id).then(({ success, data }) => {
      if (success && data) setHasCloudBackup(data.some(b => b.wallet_address === address));
    });
  }, [address, userProfile?.id]);

  const copyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setAddressCopied(true);
    showToast(t('settings.addressCopied'), 'success');
    setTimeout(() => setAddressCopied(false), 2000);
  };

  const activeChain = EVM_CHAINS.find(c => c.id === currentEvmChain) ?? EVM_CHAINS[1];

  return (
    <div className="max-w-lg mx-auto space-y-6 pb-24 page-enter px-3 sm:px-4 md:px-0">

      {/* ── Page title ── */}
      <div className="pt-1">
        <h1 className="text-2xl sm:text-3xl font-heading font-black tracking-widest text-gray-950 dark:text-white uppercase">
          {t('settings.title')}
        </h1>
        <p className="text-[11px] font-body text-gray-500 dark:text-gray-500 mt-0.5">
          Manage your wallet, security, and preferences
        </p>
      </div>

      {/* ── Profile hero card ── */}
      <div className="relative bg-gray-50 dark:bg-[#0a0a0a]/80 backdrop-blur-xl border-2 border-gray-200 dark:border-white/5 rounded-3xl overflow-hidden shadow-lg">
        {/* Subtle top glow */}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-emerald-500/8 dark:from-emerald-500/10 to-transparent pointer-events-none" />

        <div className="relative flex flex-col items-center pt-8 pb-6 px-4 gap-3">

          {/* Avatar ring + camera button */}
          <div className="relative">
            {/* Glow ring */}
            <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-emerald-400 via-cyan-400 to-blue-500 dark:from-emerald-400 dark:via-cyan-400 dark:to-blue-500 opacity-70 blur-[3px]" />
            {/* Ring border */}
            <div className="relative w-24 h-24 rounded-full p-[3px] bg-gradient-to-br from-emerald-400 via-cyan-400 to-blue-500">
              <div className="w-full h-full rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                {userProfile?.avatar
                  ? <span className="text-5xl leading-none select-none">{userProfile.avatar}</span>
                  : <span className="text-5xl leading-none select-none">👤</span>}
              </div>
            </div>
            {/* Camera button */}
            <button
              onClick={() => navigate('/wallet/profile')}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-400 border-2 border-gray-50 dark:border-[#0a0a0a] flex items-center justify-center shadow-lg transition-all active:scale-90"
              aria-label="Edit profile"
            >
              <Edit size={13} className="text-white" />
            </button>
          </div>

          {/* Name + edit */}
          <div className="flex items-center gap-2 mt-1">
            <h2 className="text-lg font-heading font-black tracking-widest text-gray-950 dark:text-white uppercase">
              {userProfile?.name || t('settings.anonymous')}
            </h2>
            <button
              onClick={() => navigate('/wallet/profile')}
              className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors active:scale-90"
              aria-label="Edit name"
            >
              <Edit size={13} className="text-gray-400 dark:text-gray-500" />
            </button>
          </div>

          {/* Address pill */}
          <button
            onClick={copyAddress}
            className="flex items-center gap-2 px-4 py-2 bg-gray-200/80 dark:bg-white/10 border border-gray-300 dark:border-white/15 rounded-full hover:bg-gray-300/80 dark:hover:bg-white/15 active:scale-95 transition-all"
          >
            <span className="text-[11px] font-numbers font-black text-gray-700 dark:text-gray-300 tracking-[0.1em]">
              {address ? `${address.slice(0, 6)}….${address.slice(-4)}` : '—'}
            </span>
            {addressCopied
              ? <Check size={12} className="text-emerald-500" />
              : <Copy size={12} className="text-gray-500 dark:text-gray-400" />}
          </button>

          {/* Network + email row */}
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <span className={`px-2.5 py-1 rounded-full text-[9px] font-heading font-black uppercase tracking-widest ${
              network === 'mainnet'
                ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/25'
                : 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/25'
            }`}>
              {network === 'mainnet' ? '● Mainnet' : '● Testnet'}
            </span>
            {userProfile?.email && (
              <span className="text-[10px] font-mono text-gray-500 dark:text-gray-500 truncate max-w-[180px]">
                {userProfile.email}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Wallet activation status ── */}
      <div className={`border-2 rounded-2xl p-4 flex items-center gap-3 shadow-sm ${
        isActivated
          ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20'
          : 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20'
      }`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${
          isActivated ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-amber-500'
        }`}>
          <Zap size={18} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className={`text-sm font-heading font-black uppercase tracking-widest ${isActivated ? 'text-emerald-900 dark:text-emerald-300' : 'text-amber-900 dark:text-amber-300'}`}>
              {isActivated ? 'Wallet Activated' : 'Not Activated'}
            </p>
            {isActivated && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/15 rounded-full border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[8px] font-black uppercase text-emerald-600 dark:text-emerald-400">Live</span>
              </span>
            )}
          </div>
          {isActivated && activatedAt ? (
            <p className="text-[10px] font-body text-emerald-700 dark:text-emerald-500">
              Since <span className="font-numbers font-medium">{new Date(activatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              {activationFeePaid > 0 && <span className="ml-1">· <span className="font-numbers font-medium">{activationFeePaid.toFixed(4)}</span> TON</span>}
            </p>
          ) : (
            <p className="text-[10px] font-body text-amber-700 dark:text-amber-400">
              Purchase a node to unlock full wallet access.
            </p>
          )}
        </div>
        {!isActivated && (
          <button
            onClick={() => navigate('/wallet/sales-package')}
            className="flex-shrink-0 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-heading font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm"
          >
            Activate
          </button>
        )}
      </div>

      {/* ── Wallets ── */}
      <div>
        <SectionLabel>{t('settings.walletManagement')}</SectionLabel>
        <Card>
          <div className="px-4 py-3">
            <WalletSwitcher />
          </div>
        </Card>
      </div>

      {/* ── Security ── */}
      <div>
        <SectionLabel>{t('settings.security')}</SectionLabel>
        <Card>
          <Row
            icon={Key}
            iconColor="bg-violet-100 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400"
            label={activeWalletType === 'secondary' ? 'Backup Seed Phrase' : t('settings.backupRecoveryPhrase')}
            sub={activeWalletType === 'secondary' ? '12-word multi-chain seed' : '24-word TON recovery phrase'}
            onClick={() => openExportModal('mnemonic')}
          />

          {activeWalletType === 'secondary' ? (
            <Row
              icon={Wallet}
              iconColor="bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"
              label="Multi-Chain WDK Wallet"
              sub="EVM · TON · BTC — all from one seed"
            />
          ) : (
            <Row
              icon={Lock}
              iconColor="bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400"
              label={t('settings.exportPrivateKey')}
              sub={t('settings.advancedUsers')}
              onClick={() => openExportModal('privatekey')}
            />
          )}

          <Row
            icon={Cloud}
            iconColor="bg-sky-100 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400"
            label="Cloud Backup"
            sub="Encrypted backup stored securely online"
            onClick={() => navigate('/wallet/cloud-backup')}
            right={
              <div className="flex items-center gap-2">
                {hasCloudBackup === null
                  ? <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-white/20 animate-pulse" />
                  : <Badge on={!!hasCloudBackup} onLabel="Backed up" offLabel="No backup" />}
                <ChevronRight size={15} className="text-gray-400 dark:text-gray-600" />
              </div>
            }
          />

          <Row
            icon={Shield}
            iconColor="bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            label="Two-Factor Auth"
            sub={is2faEnabled ? 'TOTP active on this wallet' : 'Add TOTP login protection'}
            onClick={() => navigate('/wallet/2fa')}
            right={
              <div className="flex items-center gap-2">
                {is2faEnabled === null
                  ? <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-white/20 animate-pulse" />
                  : <Badge on={!!is2faEnabled} />}
                <ChevronRight size={15} className="text-gray-400 dark:text-gray-600" />
              </div>
            }
          />

          <Row
            icon={RefreshCw}
            iconColor="bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
            label="Address Migration"
            sub="EQ → UQ format update · Link old activation"
            onClick={() => {
              // Reset dismissed flags and trigger the always-mounted modal in App.tsx
              localStorage.removeItem('rhiza_address_changelog_dismissed_v1');
              localStorage.removeItem('rhiza_activation_link_dismissed_v1');
              localStorage.removeItem('rhiza_activation_link_pending');
              window.dispatchEvent(new Event('rhiza:address_migration_trigger'));
            }}
            right={
              <div className="flex items-center gap-2">
                {hasOldActivation && !isActivated && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/15 rounded-full border border-amber-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-[8px] font-black uppercase text-amber-600 dark:text-amber-400">Action</span>
                  </span>
                )}
                <ChevronRight size={15} className="text-gray-400 dark:text-gray-600" />
              </div>
            }
          />
        </Card>
      </div>

      {/* ── Network ── */}
      <div>
        <SectionLabel>{t('settings.network')}</SectionLabel>
        <Card>
          {/* TON — both wallet types */}
          <Row
            icon={Globe}
            iconColor="bg-cyan-100 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
            label="TON Network"
            sub={network === 'mainnet' ? 'TON Mainnet' : 'TON Testnet'}
            right={
              <button
                onClick={() => switchNetwork(network === 'mainnet' ? 'testnet' : 'mainnet')}
                className="px-3 py-1.5 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-lg text-[9px] font-heading font-black uppercase tracking-widest text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-emerald-600 dark:hover:text-primary transition-all active:scale-95 shadow-sm"
              >
                {t('settings.switch')}
              </button>
            }
          />

          {/* EVM — 12-phrase only */}
          {activeWalletType === 'secondary' && (
            <>
              <Row
                icon={Layers}
                iconColor="bg-violet-100 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400"
                label="EVM Network"
                sub={`Active: ${activeChain.label}`}
                right={
                  <button
                    onClick={() => setEvmOpen(o => !o)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-white/5 border-2 border-gray-300 dark:border-white/10 rounded-lg text-[9px] font-heading font-black uppercase tracking-widest text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 transition-all active:scale-95 shadow-sm"
                  >
                    Change
                    <ChevronDown size={11} className={`transition-transform duration-200 ${evmOpen ? 'rotate-180' : ''}`} />
                  </button>
                }
              />
              {evmOpen && (
                <div className="px-4 pb-4 pt-1 grid grid-cols-2 gap-2 border-t border-gray-100 dark:border-white/5">
                  {EVM_CHAINS.map(chain => {
                    const isActive = currentEvmChain === chain.id;
                    return (
                      <button
                        key={chain.id}
                        onClick={async () => {
                          await switchEvmChain(chain.id);
                          setEvmOpen(false);
                          showToast(`Switched to ${chain.label}`, 'success');
                        }}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-[10px] font-heading font-black uppercase tracking-widest transition-all active:scale-95 ${
                          isActive
                            ? 'bg-emerald-50 dark:bg-[#00FF88]/10 border-emerald-300 dark:border-[#00FF88]/30 text-emerald-700 dark:text-[#00FF88]'
                            : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/8 text-gray-700 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/10 hover:border-gray-300 dark:hover:border-white/15'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${chain.dot}`} />
                        <span className="truncate">{chain.label}</span>
                        {isActive && <Check size={11} className="ml-auto flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </Card>
      </div>

      {/* ── Preferences ── */}
      <div>
        <SectionLabel>{t('settings.preferences')}</SectionLabel>
        <Card>
          <Row
            icon={theme === 'dark' ? Moon : Sun}
            iconColor={theme === 'dark'
              ? 'bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
              : 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'}
            label={t('settings.theme')}
            sub={theme === 'dark' ? t('settings.darkMode') : t('settings.lightMode')}
            onClick={toggleTheme}
            right={<Toggle on={theme === 'dark'} />}
          />

          <div className="flex items-start gap-3 px-4 py-3.5 border-b border-gray-100 dark:border-white/5">
            <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-white/10 flex items-center justify-center flex-shrink-0 text-gray-600 dark:text-gray-400">
              <Globe size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-heading font-black text-gray-900 dark:text-white uppercase tracking-widest mb-3">{t('settings.language')}</p>
              <LanguageSelector />
            </div>
          </div>

          <Row
            icon={Bell}
            iconColor="bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400"
            label={t('settings.notifications')}
            sub={t('settings.manageNotifications')}
            onClick={() => navigate('/wallet/notifications')}
          />
        </Card>
      </div>

      {/* ── Support & Legal ── */}
      <div>
        <SectionLabel>Support & Legal</SectionLabel>
        <Card>
          <Row icon={HelpCircle} iconColor="bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400" label="Help Center"        onClick={() => navigate('/help')} />
          <Row icon={FileText}   iconColor="bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400" label="Terms of Service"   onClick={() => navigate('/terms')} />
          <Row icon={Info}       iconColor="bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400" label="Privacy Policy"     onClick={() => navigate('/privacy')} />
        </Card>
      </div>

      {/* ── Security notice ── */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/20 rounded-2xl shadow-sm">
        <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-[11px] font-heading font-black text-amber-900 dark:text-amber-300 uppercase tracking-widest mb-1">
            {t('settings.securityWarning')}
          </p>
          <p className="text-[10px] font-body text-amber-700 dark:text-amber-400 leading-relaxed">
            {t('settings.securityWarningDesc')}
          </p>
        </div>
      </div>

      {/* ── Danger zone ── */}
      <div>
        <SectionLabel>{t('settings.dangerZone')}</SectionLabel>
        <Card>
          <Row
            icon={LogOut}
            label={t('settings.logout')}
            sub={t('settings.logoutDesc')}
            onClick={() => setShowLogoutConfirm(true)}
            danger
          />
          <Row
            icon={Trash2}
            label={t('settings.deleteWallet')}
            sub={t('settings.deleteWalletDesc')}
            onClick={() => setShowDeleteConfirm(true)}
            danger
          />
        </Card>
      </div>

      {/* ── Version ── */}
      <p className="text-center text-[10px] font-numbers font-black uppercase tracking-[0.3em] text-gray-400 dark:text-gray-600 pb-2">
        RhizaCore v1.0.4-LXC
      </p>

      {/* ── Address Migration Modal (on-demand from settings) ── */}
      {showAddressMigration && (
        <AddressChangelogModalInline onDone={() => setShowAddressMigration(false)} />
      )}
    </div>
  );
};

export default Settings;

// ── Inline wrapper: mounts AddressChangelogModal forced-open from Settings ──
// Dismissed keys are cleared before this renders, so the modal will show.
const AddressChangelogModalInline: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  // Dynamically import to avoid circular deps
  const [Modal, setModal] = React.useState<React.ComponentType | null>(null);

  React.useEffect(() => {
    import('../components/AddressChangelogModal').then(m => {
      setModal(() => m.default);
    });
  }, []);

  // Listen for the modal closing (dismissed keys being set) and call onDone
  React.useEffect(() => {
    const interval = setInterval(() => {
      const done =
        localStorage.getItem('rhiza_address_changelog_dismissed_v1') === 'true' ||
        localStorage.getItem('rhiza_activation_link_dismissed_v1') === 'true';
      if (done) {
        clearInterval(interval);
        onDone();
      }
    }, 300);
    return () => clearInterval(interval);
  }, [onDone]);

  if (!Modal) return null;
  return <Modal />;
};
