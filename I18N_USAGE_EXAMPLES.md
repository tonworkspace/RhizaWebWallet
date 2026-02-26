# 🌍 i18n Usage Examples

## Example 1: Simple Text Translation

### Before:
```typescript
const Dashboard = () => {
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Total Portfolio</p>
      <button>Send</button>
      <button>Receive</button>
    </div>
  );
};
```

### After:
```typescript
import { useTranslation } from 'react-i18next';

const Dashboard = () => {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('dashboard.title')}</h1>
      <p>{t('dashboard.totalPortfolio')}</p>
      <button>{t('dashboard.pay')}</button>
      <button>{t('dashboard.receive')}</button>
    </div>
  );
};
```

## Example 2: With Variables

### Translation File (en.json):
```json
{
  "welcome": "Welcome back, {{name}}!",
  "balance": "Your balance is {{amount}} {{currency}}"
}
```

### Component:
```typescript
const { t } = useTranslation();

<h1>{t('welcome', { name: 'John' })}</h1>
// Output: "Welcome back, John!"

<p>{t('balance', { amount: 1000, currency: 'TON' })}</p>
// Output: "Your balance is 1000 TON"
```

## Example 3: Conditional Translations

```typescript
const { t } = useTranslation();

const status = transaction.status;
const statusText = t(`wallet.${status}`); // wallet.pending, wallet.completed, wallet.failed

<span>{statusText}</span>
```

## Example 4: Pluralization

### Translation File:
```json
{
  "items": "{{count}} item",
  "items_plural": "{{count}} items"
}
```

### Component:
```typescript
<p>{t('items', { count: 1 })}</p>  // "1 item"
<p>{t('items', { count: 5 })}</p>  // "5 items"
```

## Example 5: Language Selector in Header

```typescript
import LanguageSelector from '../components/LanguageSelector';

const Header = () => {
  return (
    <header className="flex items-center justify-between p-4">
      <Logo />
      <div className="flex items-center gap-2">
        <LanguageSelector compact />
        <UserMenu />
      </div>
    </header>
  );
};
```

## Example 6: Language Selector in Settings

```typescript
import LanguageSelector from '../components/LanguageSelector';

const Settings = () => {
  return (
    <div className="space-y-4">
      <h1>Settings</h1>
      
      <section>
        <h2>Language</h2>
        <LanguageSelector />
      </section>
      
      <section>
        <h2>Other Settings</h2>
        {/* ... */}
      </section>
    </div>
  );
};
```

## Example 7: Programmatic Language Change

```typescript
import { useTranslation } from 'react-i18next';

const LanguageButtons = () => {
  const { i18n } = useTranslation();
  
  return (
    <div className="flex gap-2">
      <button onClick={() => i18n.changeLanguage('en')}>
        🇺🇸 English
      </button>
      <button onClick={() => i18n.changeLanguage('es')}>
        🇪🇸 Español
      </button>
      <button onClick={() => i18n.changeLanguage('fr')}>
        🇫🇷 Français
      </button>
      <button onClick={() => i18n.changeLanguage('zh')}>
        🇨🇳 中文
      </button>
    </div>
  );
};
```

## Example 8: Get Current Language

```typescript
const { i18n } = useTranslation();

const currentLanguage = i18n.language; // 'en', 'es', 'fr', etc.

// Use in conditional rendering
{i18n.language === 'ar' && (
  <div dir="rtl">
    {/* RTL content for Arabic */}
  </div>
)}
```

## Example 9: Check if Translation Exists

```typescript
const { t, i18n } = useTranslation();

const getTranslation = (key: string, fallback: string) => {
  return i18n.exists(key) ? t(key) : fallback;
};

<p>{getTranslation('custom.key', 'Default Text')}</p>
```

## Example 10: Array of Translations

```typescript
const { t } = useTranslation();

const steps = [
  t('onboarding.step1'),
  t('onboarding.step2'),
  t('onboarding.step3'),
];

{steps.map((step, index) => (
  <div key={index}>{step}</div>
))}
```

## Example 11: Error Messages

```typescript
const { t } = useTranslation();

try {
  await sendTransaction();
} catch (error) {
  const errorMessage = error.code 
    ? t(`errors.${error.code}`)
    : t('errors.generic');
  
  showToast(errorMessage, 'error');
}
```

## Example 12: Form Labels

```typescript
const { t } = useTranslation();

<form>
  <label>{t('transfer.recipientAddress')}</label>
  <input 
    placeholder={t('transfer.enterAddress')}
    type="text"
  />
  
  <label>{t('transfer.amount')}</label>
  <input 
    placeholder={t('transfer.enterAmount')}
    type="number"
  />
  
  <button>{t('transfer.send')}</button>
</form>
```

## Example 13: Toast Notifications

```typescript
const { t } = useTranslation();
const { showToast } = useToast();

const handleCopy = () => {
  navigator.clipboard.writeText(address);
  showToast(t('wallet.addressCopied'), 'success');
};

const handleError = () => {
  showToast(t('errors.network'), 'error');
};
```

## Example 14: Navigation Menu

```typescript
const { t } = useTranslation();

const menuItems = [
  { path: '/wallet/dashboard', label: t('nav.dashboard'), icon: Home },
  { path: '/wallet/assets', label: t('nav.assets'), icon: Wallet },
  { path: '/wallet/history', label: t('nav.history'), icon: History },
  { path: '/wallet/settings', label: t('nav.settings'), icon: Settings },
];

{menuItems.map(item => (
  <Link key={item.path} to={item.path}>
    <item.icon />
    <span>{item.label}</span>
  </Link>
))}
```

## Example 15: Loading States

```typescript
const { t } = useTranslation();

{isLoading ? (
  <div>
    <Spinner />
    <p>{t('common.loading')}</p>
  </div>
) : (
  <Content />
)}
```

## Testing Language Changes

### Test in Browser Console:
```javascript
// Change language
window.i18n.changeLanguage('es');

// Get current language
console.log(window.i18n.language);

// Check if key exists
console.log(window.i18n.exists('dashboard.title'));
```

### Test Component:
```typescript
import { useTranslation } from 'react-i18next';

const LanguageTest = () => {
  const { t, i18n } = useTranslation();
  
  return (
    <div>
      <p>Current: {i18n.language}</p>
      <p>{t('dashboard.title')}</p>
      
      <button onClick={() => i18n.changeLanguage('en')}>EN</button>
      <button onClick={() => i18n.changeLanguage('es')}>ES</button>
      <button onClick={() => i18n.changeLanguage('fr')}>FR</button>
      <button onClick={() => i18n.changeLanguage('zh')}>ZH</button>
    </div>
  );
};
```

## Common Patterns

### Pattern 1: Status Badge
```typescript
const StatusBadge = ({ status }: { status: string }) => {
  const { t } = useTranslation();
  return <span>{t(`wallet.${status}`)}</span>;
};
```

### Pattern 2: Dynamic Keys
```typescript
const { t } = useTranslation();
const type = 'sent'; // or 'received'
<h2>{t(`history.${type}`)}</h2>
```

### Pattern 3: Fallback Chain
```typescript
const { t, i18n } = useTranslation();

const getText = (key: string) => {
  if (i18n.exists(key)) return t(key);
  if (i18n.exists(`${key}_fallback`)) return t(`${key}_fallback`);
  return key;
};
```

## Tips

1. **Always use keys, not hardcoded text**
   - ❌ `<button>Send</button>`
   - ✅ `<button>{t('wallet.send')}</button>`

2. **Keep keys organized by feature**
   - `dashboard.*` for dashboard
   - `wallet.*` for wallet operations
   - `settings.*` for settings

3. **Use descriptive key names**
   - ❌ `t('btn1')`
   - ✅ `t('dashboard.sendButton')`

4. **Test with longer translations**
   - German and French tend to be longer
   - Ensure UI doesn't break

5. **Use variables for dynamic content**
   - ❌ `"Balance: " + amount`
   - ✅ `t('balance', { amount })`
