import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check } from 'lucide-react';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

const languages: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
];

interface LanguageSelectorProps {
  compact?: boolean;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ compact = false }) => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<Language>(
    languages.find(lang => lang.code === i18n.language) || languages[0]
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen) {
        const target = event.target as HTMLElement;
        if (!target.closest('.language-selector')) {
          setIsOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const changeLanguage = (langCode: string) => {
    i18n.changeLanguage(langCode);
    const newLang = languages.find(lang => lang.code === langCode);
    if (newLang) {
      setCurrentLanguage(newLang);
    }
    setIsOpen(false);
  };

  if (compact) {
    return (
      <div className="relative language-selector">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 sm:p-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-all text-slate-600 dark:text-gray-400 active:scale-90 flex items-center gap-1.5"
          aria-label="Select language"
        >
          <Globe size={16} />
          <span className="text-xs font-bold">{currentLanguage.flag}</span>
        </button>

        {isOpen && (
          <div className="absolute right-0 top-full mt-2 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl z-50 overflow-hidden min-w-[200px] max-h-[400px] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                className={`w-full px-4 py-2.5 text-left text-xs font-medium transition-colors flex items-center justify-between gap-2 ${
                  currentLanguage.code === lang.code
                    ? 'bg-primary/10 text-primary'
                    : 'text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{lang.flag}</span>
                  <span>{lang.nativeName}</span>
                </div>
                {currentLanguage.code === lang.code && (
                  <Check size={14} className="text-primary" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative language-selector">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl sm:rounded-2xl hover:bg-slate-50 dark:hover:bg-white/10 transition-all flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center">
            <Globe size={20} className="text-slate-600 dark:text-gray-400" />
          </div>
          <div className="text-left">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-gray-500">
              Language
            </p>
            <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{currentLanguage.flag}</span>
              <span>{currentLanguage.nativeName}</span>
            </p>
          </div>
        </div>
        <div className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-slate-400 dark:text-gray-500">
            <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-white/10 rounded-xl sm:rounded-2xl shadow-xl z-50 overflow-hidden max-h-[400px] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={`w-full px-4 py-3 text-left transition-colors flex items-center justify-between ${
                currentLanguage.code === lang.code
                  ? 'bg-primary/10 text-primary'
                  : 'text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{lang.flag}</span>
                <div>
                  <p className="text-sm font-bold">{lang.nativeName}</p>
                  <p className="text-xs text-slate-500 dark:text-gray-500">{lang.name}</p>
                </div>
              </div>
              {currentLanguage.code === lang.code && (
                <Check size={18} className="text-primary" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
