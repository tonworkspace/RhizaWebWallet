# 🚀 i18n Quick Start Guide

## 🎯 Quick Usage

### 1. Use in Any Component
```typescript
import { useTranslation } from 'react-i18next';

const MyComponent = () => {
  const { t } = useTranslation();
  
  return <h1>{t('dashboard.title')}</h1>;
};
```

### 2. Add Language Selector
```typescript
import LanguageSelector from '../components/LanguageSelector';

// Compact (for headers)
<LanguageSelector compact />

// Full (for settings)
<LanguageSelector />
```

### 3. Change Language
```typescript
const { i18n } = useTranslation();
i18n.changeLanguage('es'); // Spanish
```

## 📝 Available Languages

| Code | Language | Status |
|------|----------|--------|
| en 🇺🇸 | English | ✅ Complete |
| es 🇪🇸 | Spanish | ✅ Complete |
| fr 🇫🇷 | French | ✅ Complete |
| zh 🇨🇳 | Chinese | ✅ Complete |
| de 🇩🇪 | German | ⏳ Placeholder |
| ja 🇯🇵 | Japanese | ⏳ Placeholder |
| ko 🇰🇷 | Korean | ⏳ Placeholder |
| ru 🇷🇺 | Russian | ⏳ Placeholder |
| ar 🇸🇦 | Arabic | ⏳ Placeholder |
| pt 🇵🇹 | Portuguese | ⏳ Placeholder |

## 🔑 Common Translation Keys

```typescript
// Navigation
t('nav.dashboard')
t('nav.assets')
t('nav.history')
t('nav.settings')

// Dashboard
t('dashboard.title')
t('dashboard.totalPortfolio')
t('dashboard.pay')
t('dashboard.receive')
t('dashboard.shop')

// Wallet
t('wallet.balance')
t('wallet.send')
t('wallet.receive')
t('wallet.address')

// Common
t('common.loading')
t('common.error')
t('common.success')
t('common.cancel')
t('common.confirm')

// Errors
t('errors.generic')
t('errors.network')
t('errors.invalidAddress')
```

## 🎨 Where It's Integrated

✅ **App.tsx** - i18n initialized
✅ **Dashboard.tsx** - Language selector added
✅ **Settings.tsx** - i18n hook added
✅ **LanguageSelector.tsx** - New component

## 🔄 Next: Migrate Components

Replace hardcoded text with `t()` calls:

```typescript
// Before
<button>Send</button>

// After
<button>{t('wallet.send')}</button>
```

## 📚 Full Documentation

See `I18N_INTEGRATION_COMPLETE.md` for complete details.
