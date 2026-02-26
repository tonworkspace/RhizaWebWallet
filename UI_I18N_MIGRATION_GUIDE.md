# UI i18n Migration Guide

## Overview
This guide explains how to migrate all hardcoded English text in the UI to use the i18n translation system.

## Current Status
- ✅ Translation files complete (10 languages)
- ✅ i18n configuration set up
- ✅ LanguageSelector component working
- ⚠️ Most UI components still have hardcoded English text

## How to Use Translations in Components

### 1. Import the hook
```typescript
import { useTranslation } from 'react-i18next';
```

### 2. Use the hook in your component
```typescript
const MyComponent: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('dashboard.title')}</h1>
      <button>{t('common.save')}</button>
    </div>
  );
};
```

### 3. Replace hardcoded text
**Before:**
```typescript
<button>Save Changes</button>
<p>Loading...</p>
```

**After:**
```typescript
<button>{t('common.save')}</button>
<p>{t('common.loading')}</p>
```

## Translation Key Reference

### Common Keys
- `t('common.loading')` - "Loading..."
- `t('common.error')` - "Error"
- `t('common.success')` - "Success"
- `t('common.cancel')` - "Cancel"
- `t('common.confirm')` - "Confirm"
- `t('common.save')` - "Save"
- `t('common.delete')` - "Delete"
- `t('common.edit')` - "Edit"
- `t('common.close')` - "Close"
- `t('common.back')` - "Back"
- `t('common.next')` - "Next"
- `t('common.retry')` - "Retry"
- `t('common.viewAll')` - "View All"

### Navigation Keys
- `t('nav.dashboard')` - "Dashboard"
- `t('nav.assets')` - "Assets"
- `t('nav.history')` - "History"
- `t('nav.referral')` - "Referral"
- `t('nav.settings')` - "Settings"

### Dashboard Keys
- `t('dashboard.title')` - "Dashboard"
- `t('dashboard.totalPortfolio')` - "Total Portfolio"
- `t('dashboard.hideBalance')` - "Hide balance"
- `t('dashboard.showBalance')` - "Show balance"
- `t('dashboard.refreshBalance')` - "Refresh balance"
- `t('dashboard.pay')` - "Pay"
- `t('dashboard.receive')` - "Receive"
- `t('dashboard.shop')` - "Shop"
- `t('dashboard.recentActivity')` - "Recent Activity"
- `t('dashboard.noTransactions')` - "No transactions yet"
- `t('dashboard.makeFirstTransaction')` - "Make First Transaction"

### Wallet Keys
- `t('wallet.balance')` - "Balance"
- `t('wallet.address')` - "Address"
- `t('wallet.copyAddress')` - "Copy Address"
- `t('wallet.send')` - "Send"
- `t('wallet.receive')` - "Receive"
- `t('wallet.amount')` - "Amount"
- `t('wallet.fee')` - "Fee"
- `t('wallet.total')` - "Total"

### Settings Keys
- `t('settings.title')` - "Settings"
- `t('settings.language')` - "Language"
- `t('settings.theme')` - "Theme"
- `t('settings.security')` - "Security"
- `t('settings.changePassword')` - "Change Password"

### Error Keys
- `t('errors.generic')` - "Something went wrong"
- `t('errors.network')` - "Network error"
- `t('errors.invalidAddress')` - "Invalid address"
- `t('errors.insufficientBalance')` - "Insufficient balance"

## Components That Need Migration

### High Priority (User-Facing)
1. ✅ Dashboard.tsx - Partially done
2. ⚠️ Assets.tsx
3. ⚠️ History.tsx
4. ⚠️ Referral.tsx
5. ✅ Settings.tsx - Partially done
6. ⚠️ Transfer.tsx
7. ⚠️ Receive.tsx
8. ⚠️ WalletLogin.tsx
9. ⚠️ CreateWallet.tsx
10. ⚠️ ImportWallet.tsx

### Medium Priority
11. ⚠️ Layout.tsx (Navigation)
12. ⚠️ Notifications.tsx
13. ⚠️ Activity.tsx
14. ⚠️ AIAssistant.tsx
15. ⚠️ Landing.tsx

### Low Priority (Admin/Test Pages)
16. AdminDashboard.tsx
17. DatabaseTest.tsx
18. SupabaseConnectionTest.tsx

## Quick Migration Steps

### For Each Component:

1. **Add the import**
   ```typescript
   import { useTranslation } from 'react-i18next';
   ```

2. **Add the hook**
   ```typescript
   const { t } = useTranslation();
   ```

3. **Find all hardcoded strings**
   - Look for text in quotes: `"Dashboard"`, `'Loading...'`
   - Look for button labels, headings, paragraphs
   - Look for placeholder text, aria-labels

4. **Replace with translation keys**
   - Match the text to the appropriate key in the translation files
   - Use `{t('key.path')}` instead of the hardcoded string

5. **Test**
   - Switch languages in Settings
   - Verify all text changes correctly

## Example: Migrating a Button

**Before:**
```typescript
<button className="btn-primary">
  Send Transaction
</button>
```

**After:**
```typescript
<button className="btn-primary">
  {t('transfer.send')}
</button>
```

## Example: Migrating with Variables

**Before:**
```typescript
<p>Balance: {balance} TON</p>
```

**After:**
```typescript
<p>{t('wallet.balance')}: {balance} TON</p>
```

## Tips

1. **Keep aria-labels translated** for accessibility
   ```typescript
   aria-label={t('dashboard.refreshBalance')}
   ```

2. **Don't translate**:
   - Variable names
   - API endpoints
   - Technical identifiers
   - Brand names (Rhiza, TON, RZC)
   - Currency codes (USD, BTC, EUR)

3. **Do translate**:
   - All user-visible text
   - Button labels
   - Headings and titles
   - Error messages
   - Placeholders
   - Tooltips

## Testing Checklist

After migrating a component:
- [ ] Component renders without errors
- [ ] All text is visible (no missing translations)
- [ ] Language switching works
- [ ] Text makes sense in context
- [ ] No console errors
- [ ] Mobile view looks correct

## Need More Translation Keys?

If you need a translation key that doesn't exist:

1. Add it to ALL language files in `i18n/locales/`
2. Follow the existing structure
3. Use descriptive key names
4. Keep translations consistent across languages

## Automated Migration (Future)

Consider creating a script to:
1. Scan all `.tsx` files
2. Extract hardcoded strings
3. Generate translation keys
4. Replace strings with `t()` calls

This would speed up the migration significantly.
