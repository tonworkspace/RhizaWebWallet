import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check, ChevronDown } from 'lucide-react';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

const languages: Language[] = [
  { code: 'en', name: 'English',    nativeName: 'English',    flag: '🇺🇸' },
  { code: 'es', name: 'Spanish',    nativeName: 'Español',    flag: '🇪🇸' },
  { code: 'fr', name: 'French',     nativeName: 'Français',   flag: '🇫🇷' },
  { code: 'de', name: 'German',     nativeName: 'Deutsch',    flag: '🇩🇪' },
  { code: 'zh', name: 'Chinese',    nativeName: '中文',        flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese',   nativeName: '日本語',      flag: '🇯🇵' },
  { code: 'ko', name: 'Korean',     nativeName: '한국어',      flag: '🇰🇷' },
  { code: 'ru', name: 'Russian',    nativeName: 'Русский',    flag: '🇷🇺' },
  { code: 'ar', name: 'Arabic',     nativeName: 'العربية',    flag: '🇸🇦' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português',  flag: '🇵🇹' },
];

interface LanguageSelectorProps {
  /** Compact mode: small icon button + floating dropdown (used in nav bars) */
  compact?: boolean;
  onSelect?: () => void;
  /** External open state (compact mode only) */
  isOpen?: boolean;
  onToggle?: () => void;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  compact = false,
  onSelect,
  isOpen: externalIsOpen,
  onToggle,
}) => {
  const { i18n } = useTranslation();
  const [internalOpen, setInternalOpen] = useState(false);
  const [current, setCurrent] = useState<Language>(
    languages.find(l => l.code === i18n.language) ?? languages[0]
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const isOpen    = externalIsOpen !== undefined ? externalIsOpen : internalOpen;
  const toggleOpen = onToggle ?? (() => setInternalOpen(o => !o));

  // Close on outside click (compact only — inline mode doesn't need it)
  useEffect(() => {
    if (!compact) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setInternalOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [compact]);

  const select = (code: string) => {
    i18n.changeLanguage(code);
    const lang = languages.find(l => l.code === code);
    if (lang) setCurrent(lang);
    if (!externalIsOpen) setInternalOpen(false);
    onSelect?.();
  };

  // ── Compact mode (nav bar icon button + floating list) ────────────────────
  if (compact) {
    return (
      <div ref={containerRef} className="relative language-selector">
        {!onToggle && (
          <button
            onClick={toggleOpen}
            className="p-2 sm:p-2.5 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 rounded-xl transition-all text-slate-600 dark:text-gray-400 active:scale-90 flex items-center gap-1.5"
            aria-label="Select language"
          >
            <Globe size={16} />
            <span className="text-xs font-bold">{current.flag}</span>
          </button>
        )}

        {isOpen && (
          <div className="absolute right-0 top-full mt-2 bg-white dark:bg-[#0f0f0f] border-2 border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden min-w-[200px] max-h-[360px] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
            {languages.map(lang => (
              <button
                key={lang.code}
                onClick={() => select(lang.code)}
                className={`w-full px-4 py-3 text-left text-sm font-semibold transition-colors flex items-center justify-between gap-3 border-b border-gray-100 dark:border-white/5 last:border-0 ${
                  current.code === lang.code
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                    : 'text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg leading-none">{lang.flag}</span>
                  <span>{lang.nativeName}</span>
                </div>
                {current.code === lang.code && <Check size={14} className="flex-shrink-0" />}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Full / inline mode (Settings page) ───────────────────────────────────
  // Shows current selection as a tappable row; expands into a scrollable grid
  // of language chips — no floating dropdown, no clipping issues.
  return (
    <div className="language-selector space-y-2">
      {/* Current selection trigger */}
      <button
        onClick={toggleOpen}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-200 dark:hover:bg-white/15 transition-all active:scale-[0.98]"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-xl leading-none">{current.flag}</span>
          <div className="text-left">
            <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{current.nativeName}</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-500 font-medium">{current.name}</p>
          </div>
        </div>
        <ChevronDown
          size={15}
          className={`text-gray-400 dark:text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Expanded language grid */}
      {isOpen && (
        <div className="grid grid-cols-2 gap-1.5 pt-0.5">
          {languages.map(lang => {
            const active = current.code === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => select(lang.code)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all active:scale-95 ${
                  active
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                    : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/8 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 hover:border-gray-300 dark:hover:border-white/15'
                }`}
              >
                <span className="text-base leading-none flex-shrink-0">{lang.flag}</span>
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">{lang.nativeName}</p>
                </div>
                {active && <Check size={11} className="ml-auto flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
