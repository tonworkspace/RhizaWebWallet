import React, { useState, useRef } from 'react';
import {
  FileText, X, Send, Loader2, Upload, CheckCircle2,
  AlertCircle, ImagePlus, Eye, ChevronRight, ChevronLeft,
  User, BarChart2, Camera, ClipboardCheck
} from 'lucide-react';
import { useVerificationForm, VerificationFormData, VerificationFiles, UploadStatus } from '../context/VerificationFormContext';
import { useToast } from '../context/ToastContext';

// ─── Constants ─────────────────────────────────────────────────────────────────

const EMPTY_FORM: VerificationFormData = {
  telegram_username: '',
  current_wallet_address: '',
  old_wallet_address: '',
  claimed_balance: '',
  available_balance_before_migration: '',
  claimable_balance_before_migration: '',
  current_balance: '',
  additional_notes: '',
};

const STEPS = [
  { id: 1, label: 'Identity',   icon: User,          desc: 'Your contact & wallet info' },
  { id: 2, label: 'Balances',   icon: BarChart2,      desc: 'Enter your balance amounts' },
  { id: 3, label: 'Screenshots',icon: Camera,         desc: 'Upload supporting evidence' },
  { id: 4, label: 'Review',     icon: ClipboardCheck, desc: 'Confirm & submit' },
];

// ─── Upload Field ──────────────────────────────────────────────────────────────

const UploadField: React.FC<{
  id: string;
  label: string;
  file: File | null;
  status: UploadStatus;
  onChange: (f: File | null) => void;
}> = ({ id, label, file, status, onChange }) => {
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) { showToast('Please select an image file', 'error'); return; }
    if (f.size > 5 * 1024 * 1024) { showToast('File size must be less than 5MB', 'error'); return; }
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(f));
    onChange(f);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setShowPreview(false);
    onChange(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const stateClass = () => {
    if (status === 'done')  return 'border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400';
    if (status === 'error') return 'border-red-300 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400';
    if (file)               return 'border-blue-300 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400';
    return 'border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-gray-500 hover:bg-slate-100 dark:hover:bg-white/10';
  };

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-gray-600">{label}</p>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleChange} className="hidden" id={id} />
      <label htmlFor={id} className={`w-full border rounded-xl py-2.5 px-3 text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${stateClass()}`}>
        {status === 'uploading' ? <Loader2 size={14} className="animate-spin flex-shrink-0" />
          : status === 'done'   ? <CheckCircle2 size={14} className="flex-shrink-0" />
          : status === 'error'  ? <AlertCircle size={14} className="flex-shrink-0" />
          : file                ? <ImagePlus size={14} className="flex-shrink-0" />
          :                       <Upload size={14} className="flex-shrink-0" />}
        <span className="truncate flex-1 min-w-0">
          {status === 'uploading' ? 'Uploading…'
            : status === 'done'  ? file?.name ?? 'Uploaded'
            : status === 'error' ? 'Upload failed — will retry'
            : file               ? file.name
            : 'Upload screenshot (JPG, PNG, WEBP · max 5MB)'}
        </span>
        {file && status !== 'uploading' && (
          <button type="button" onClick={handleRemove} className="flex-shrink-0 opacity-60 hover:opacity-100 hover:text-red-500 transition-all ml-1">
            <X size={13} />
          </button>
        )}
      </label>

      {file && preview && status !== 'uploading' && (
        <div className="flex items-center gap-2 px-1">
          <button type="button" onClick={() => setShowPreview(v => !v)}
            className="flex items-center gap-1 text-[9px] font-bold text-slate-400 hover:text-blue-500 transition-colors">
            <Eye size={11} />{showPreview ? 'Hide preview' : 'Preview'}
          </button>
        </div>
      )}
      {showPreview && preview && (
        <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-white/10">
          <img src={preview} alt="preview" className="w-full max-h-48 object-contain bg-slate-100 dark:bg-white/5" />
          <button type="button" onClick={() => setShowPreview(false)}
            className="absolute top-2 right-2 p-1 bg-black/50 rounded-lg text-white hover:bg-black/70 transition-colors">
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Step indicator ────────────────────────────────────────────────────────────

const StepBar: React.FC<{ current: number }> = ({ current }) => (
  <div className="flex items-center gap-0 px-5 py-4 border-b border-slate-100 dark:border-white/5">
    {STEPS.map((step, idx) => {
      const Icon = step.icon;
      const done = current > step.id;
      const active = current === step.id;
      return (
        <React.Fragment key={step.id}>
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              done   ? 'bg-emerald-500 text-white' :
              active ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' :
                       'bg-slate-100 dark:bg-white/10 text-slate-400 dark:text-gray-600'
            }`}>
              {done ? <CheckCircle2 size={15} /> : <Icon size={14} />}
            </div>
            <span className={`text-[9px] font-black uppercase tracking-wider hidden sm:block ${
              active ? 'text-blue-500' : done ? 'text-emerald-500' : 'text-slate-400 dark:text-gray-600'
            }`}>{step.label}</span>
          </div>
          {idx < STEPS.length - 1 && (
            <div className={`flex-1 h-0.5 mx-1 transition-all ${done ? 'bg-emerald-400' : 'bg-slate-100 dark:bg-white/10'}`} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

// ─── Review row ────────────────────────────────────────────────────────────────

const ReviewRow: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div className="flex items-start justify-between gap-3 py-2 border-b border-slate-100 dark:border-white/5 last:border-0">
    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-gray-600 flex-shrink-0">{label}</span>
    <span className={`text-[11px] font-bold text-slate-800 dark:text-white text-right break-all ${mono ? 'font-mono text-[10px]' : ''}`}>
      {value || <span className="text-slate-300 dark:text-gray-700 italic">—</span>}
    </span>
  </div>
);

// ─── Main Modal ────────────────────────────────────────────────────────────────

const VerificationFormModal: React.FC = () => {
  const { showForm, submitting, uploadState, currentAddress, closeForm, handleFormSubmit } = useVerificationForm();
  const { showToast } = useToast();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<VerificationFormData>(EMPTY_FORM);
  const [files, setFiles] = useState<VerificationFiles>({ available: null, claimable: null, current: null });

  React.useEffect(() => {
    if (showForm) {
      setFormData(prev => ({ ...prev, current_wallet_address: currentAddress }));
      setStep(1);
    } else {
      setFormData(EMPTY_FORM);
      setFiles({ available: null, claimable: null, current: null });
      setStep(1);
    }
  }, [showForm, currentAddress]);

  if (!showForm) return null;

  const set = (field: keyof VerificationFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setFormData(prev => ({ ...prev, [field]: e.target.value }));

  const setField = (field: keyof VerificationFormData, value: string) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  // ── Step validation ──────────────────────────────────────────────────────────

  const validateStep = (s: number): boolean => {
    if (s === 1) {
      if (!formData.telegram_username.trim()) { showToast('Please enter your Telegram username', 'error'); return false; }
      if (!formData.old_wallet_address.trim()) { showToast('Please enter your old wallet address', 'error'); return false; }
      if (!formData.claimed_balance.trim() || isNaN(Number(formData.claimed_balance))) {
        showToast('Please enter a valid claimed balance', 'error'); return false;
      }
    }
    return true;
  };

  const next = () => { if (validateStep(step)) setStep(s => Math.min(s + 1, 4)); };
  const back = () => setStep(s => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    await handleFormSubmit(formData, files);
  };

  const isUploading = Object.values(uploadState).some(s => s === 'uploading');
  const uploadedCount = Object.values(files).filter(Boolean).length;
  const doneCount = Object.values(uploadState).filter(s => s === 'done').length;

  const currentStep = STEPS[step - 1];

  return (
    <div className="fixed inset-0 bg-white dark:bg-[#0a0a0a] z-[60] flex flex-col overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="flex-1 flex flex-col overflow-hidden w-full max-w-2xl mx-auto">

        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center flex-shrink-0">
              <FileText size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Balance Verification</h3>
              <p className="text-[10px] text-slate-500 dark:text-gray-500 font-medium">
                {submitting
                  ? isUploading ? `Uploading screenshots (${doneCount}/${uploadedCount})…` : 'Submitting…'
                  : currentStep.desc}
              </p>
            </div>
          </div>
          <button onClick={closeForm} disabled={submitting}
            className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors disabled:opacity-40">
            <X size={16} className="text-slate-400 dark:text-gray-600" />
          </button>
        </div>

        {/* Step bar */}
        <StepBar current={step} />

        {/* Upload progress */}
        {submitting && uploadedCount > 0 && (
          <div className="px-5 pt-3 flex-shrink-0">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-bold text-slate-500 dark:text-gray-500">
                {isUploading ? 'Uploading screenshots…' : 'Screenshots uploaded'}
              </p>
              <p className="text-[10px] font-black text-blue-500">{doneCount}/{uploadedCount}</p>
            </div>
            <div className="h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${uploadedCount > 0 ? (doneCount / uploadedCount) * 100 : 0}%` }} />
            </div>
          </div>
        )}

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">

          {/* ── Step 1: Identity ─────────────────────────────────────────── */}
          {step === 1 && (
            <>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-gray-600 mb-2">
                  Telegram Username *
                </label>
                <input type="text" value={formData.telegram_username} onChange={set('telegram_username')}
                  placeholder="@username" autoFocus
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl py-3 px-4 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all" />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-gray-600 mb-2">
                  Current Wallet Address
                </label>
                <input type="text" value={formData.current_wallet_address} readOnly
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl py-3 px-4 text-sm font-bold text-slate-900 dark:text-white outline-none opacity-60" />
                <p className="text-[9px] text-slate-400 dark:text-gray-600 mt-1">Automatically filled from your active wallet</p>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-gray-600 mb-2">
                  Old Wallet Address *
                </label>
                <input type="text" value={formData.old_wallet_address} onChange={set('old_wallet_address')}
                  placeholder="EQA..."
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl py-3 px-4 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all" />
                <p className="text-[9px] text-slate-400 dark:text-gray-600 mt-1">The wallet address you used before migrating</p>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-gray-600 mb-2">
                  Claimed RZC Balance *
                </label>
                <input type="number" step="0.01" value={formData.claimed_balance} onChange={set('claimed_balance')}
                  placeholder="1000"
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl py-3 px-4 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all" />
                <p className="text-[9px] text-slate-400 dark:text-gray-600 mt-1">Total RZC balance you believe you should have</p>
              </div>
            </>
          )}

          {/* ── Step 2: Balances ─────────────────────────────────────────── */}
          {step === 2 && (
            <>
              <p className="text-[10px] text-slate-400 dark:text-gray-600 font-medium leading-relaxed">
                Enter the balance amounts from your old wallet. These help us verify your claim accurately.
              </p>

              {[
                { field: 'available_balance_before_migration' as const, label: 'Available Balance Before Migration', hint: 'Available RZC shown in your old wallet' },
                { field: 'claimable_balance_before_migration' as const, label: 'Claimable Balance Before Migration', hint: 'Claimable/pending RZC from your old wallet' },
                { field: 'current_balance' as const, label: 'Current Balance in This Wallet', hint: 'Your current RZC balance here' },
              ].map(({ field, label, hint }) => (
                <div key={field} className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-gray-500 mb-2">{label}</label>
                  <input type="number" step="0.01" min="0" value={formData[field]}
                    onChange={e => setField(field, e.target.value)} placeholder="0.00"
                    className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-2.5 px-3 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all" />
                  <p className="text-[9px] text-slate-400 dark:text-gray-600 mt-1">{hint}</p>
                </div>
              ))}

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-gray-600 mb-2">
                  Additional Notes
                </label>
                <textarea value={formData.additional_notes} onChange={set('additional_notes')}
                  placeholder="Any additional information that might help with verification..."
                  rows={3}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl py-3 px-4 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all resize-none" />
              </div>
            </>
          )}

          {/* ── Step 3: Screenshots ──────────────────────────────────────── */}
          {step === 3 && (
            <>
              <p className="text-[10px] text-slate-400 dark:text-gray-600 font-medium leading-relaxed">
                Upload screenshots as evidence. All fields are optional but improve your chances of approval.
              </p>

              <UploadField id="ss-available" label="Available Balance Before Migration"
                file={files.available} status={uploadState.available}
                onChange={f => setFiles(prev => ({ ...prev, available: f }))} />

              <UploadField id="ss-claimable" label="Claimable Balance Before Migration"
                file={files.claimable} status={uploadState.claimable}
                onChange={f => setFiles(prev => ({ ...prev, claimable: f }))} />

              <UploadField id="ss-current" label="Current Balance"
                file={files.current} status={uploadState.current}
                onChange={f => setFiles(prev => ({ ...prev, current: f }))} />

              {uploadedCount === 0 && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-start gap-2">
                  <AlertCircle size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium leading-snug">
                    No screenshots uploaded. Adding at least one significantly speeds up review.
                  </p>
                </div>
              )}
            </>
          )}

          {/* ── Step 4: Review ───────────────────────────────────────────── */}
          {step === 4 && (
            <>
              <p className="text-[10px] text-slate-400 dark:text-gray-600 font-medium leading-relaxed">
                Review your submission before sending. Go back to make any changes.
              </p>

              <div className="rounded-xl border border-slate-200 dark:border-white/5 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 dark:bg-white/[0.03] border-b border-slate-100 dark:border-white/5">
                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-gray-600">Identity</p>
                </div>
                <div className="px-4 py-1">
                  <ReviewRow label="Telegram" value={formData.telegram_username} />
                  <ReviewRow label="Old Wallet" value={formData.old_wallet_address} mono />
                  <ReviewRow label="Current Wallet" value={formData.current_wallet_address} mono />
                  <ReviewRow label="Claimed Balance" value={formData.claimed_balance ? `${Number(formData.claimed_balance).toLocaleString()} RZC` : ''} />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-white/5 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 dark:bg-white/[0.03] border-b border-slate-100 dark:border-white/5">
                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-gray-600">Balance Evidence</p>
                </div>
                <div className="px-4 py-1">
                  <ReviewRow label="Available (before)" value={formData.available_balance_before_migration ? `${Number(formData.available_balance_before_migration).toLocaleString()} RZC` : ''} />
                  <ReviewRow label="Claimable (before)" value={formData.claimable_balance_before_migration ? `${Number(formData.claimable_balance_before_migration).toLocaleString()} RZC` : ''} />
                  <ReviewRow label="Current" value={formData.current_balance ? `${Number(formData.current_balance).toLocaleString()} RZC` : ''} />
                  {formData.additional_notes && <ReviewRow label="Notes" value={formData.additional_notes} />}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-white/5 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 dark:bg-white/[0.03] border-b border-slate-100 dark:border-white/5">
                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-gray-600">Screenshots</p>
                </div>
                <div className="px-4 py-1">
                  <ReviewRow label="Available" value={files.available?.name ?? ''} />
                  <ReviewRow label="Claimable" value={files.claimable?.name ?? ''} />
                  <ReviewRow label="Current" value={files.current?.name ?? ''} />
                </div>
              </div>
            </>
          )}

        </div>

        {/* Footer nav */}
        <div className="px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-slate-100 dark:border-white/5 flex gap-3 flex-shrink-0">
          {step > 1 ? (
            <button type="button" onClick={back} disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-3 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-gray-400 rounded-xl text-sm font-black uppercase tracking-wider hover:bg-slate-200 dark:hover:bg-white/10 transition-all disabled:opacity-40">
              <ChevronLeft size={15} /> Back
            </button>
          ) : (
            <button type="button" onClick={closeForm} disabled={submitting}
              className="px-4 py-3 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-gray-400 rounded-xl text-sm font-black uppercase tracking-wider hover:bg-slate-200 dark:hover:bg-white/10 transition-all disabled:opacity-40">
              Cancel
            </button>
          )}

          {step < 4 ? (
            <button type="button" onClick={next}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 px-4 bg-blue-500 text-white rounded-xl text-sm font-black uppercase tracking-wider hover:bg-blue-600 transition-all">
              Next <ChevronRight size={15} />
            </button>
          ) : (
            <button type="button" onClick={handleSubmit} disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-blue-500 text-white rounded-xl text-sm font-black uppercase tracking-wider hover:bg-blue-600 transition-all disabled:opacity-60 disabled:cursor-not-allowed">
              {submitting
                ? <><Loader2 size={14} className="animate-spin" />{isUploading ? 'Uploading…' : 'Submitting…'}</>
                : <><Send size={14} /> Submit Request</>}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default VerificationFormModal;
