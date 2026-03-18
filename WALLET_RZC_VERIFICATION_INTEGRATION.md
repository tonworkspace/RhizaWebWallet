# 🔐 Wallet RZC Verification Integration Guide

## Overview

The wallet RZC verification system allows users to verify and recover their RZC balance from previous wallets. This system integrates directly with the user's current wallet context and provides a seamless verification experience.

## Components Created

### 1. Enhanced Balance Verification Service
- **File**: `services/balanceVerificationService.ts`
- **New Method**: `submitVerificationRequestFromWallet()`
- **Features**:
  - Direct wallet integration
  - Automatic discrepancy calculation
  - Priority level determination
  - Manual submission fallback

### 2. Wallet Verification Hook
- **File**: `hooks/useWalletVerification.ts`
- **Purpose**: Provides wallet-aware verification functionality
- **Features**:
  - Current wallet address integration
  - RZC balance integration
  - Verification status management
  - Form submission handling

### 3. Wallet RZC Verification Component
- **File**: `components/WalletRZCVerification.tsx`
- **Purpose**: Full verification form with wallet integration
- **Features**:
  - Current wallet info display
  - Automatic discrepancy calculation
  - Priority level indication
  - Screenshot upload
  - Real-time validation

### 4. Verify RZC Button
- **File**: `components/VerifyRZCButton.tsx`
- **Purpose**: Simple button to trigger verification modal
- **Features**:
  - Multiple variants (primary, secondary, outline)
  - Different sizes (sm, md, lg)
  - Status indication
  - Modal integration

### 5. Wallet Balance Card
- **File**: `components/WalletBalanceCard.tsx`
- **Purpose**: Complete balance display with verification option
- **Features**:
  - RZC balance display
  - USD value calculation
  - Verification badge integration
  - Compact and full modes

## Usage Examples

### Basic Verification Button
```tsx
import { VerifyRZCButton } from '../components/VerifyRZCButton';

// Simple verification button
<VerifyRZCButton />

// Customized button
<VerifyRZCButton 
  variant="outline" 
  size="lg" 
  className="my-custom-class" 
/>
```

### Wallet Balance Card
```tsx
import { WalletBalanceCard } from '../components/WalletBalanceCard';

// Full balance card with verification
<WalletBalanceCard />

// Compact version
<WalletBalanceCard compact={true} />

// Without verification option
<WalletBalanceCard showVerificationOption={false} />
```

### Direct Verification Component
```tsx
import { WalletRZCVerification } from '../components/WalletRZCVerification';

// Full verification form
<WalletRZCVerification 
  onClose={() => setShowModal(false)}
  className="custom-styling"
/>
```

### Using the Hook Directly
```tsx
import { useWalletVerification } from '../hooks/useWalletVerification';

function MyComponent() {
  const {
    walletAddress,
    currentRZCBalance,
    submitRZCVerification,
    hasActiveRequest,
    verificationStatus
  } = useWalletVerification();

  const handleSubmit = async (formData) => {
    const result = await submitRZCVerification(formData);
    if (result.success) {
      console.log('Verification submitted!');
    }
  };

  return (
    <div>
      <p>Wallet: {walletAddress}</p>
      <p>Balance: {currentRZCBalance} RZC</p>
      {hasActiveRequest && (
        <p>Status: {verificationStatus?.status}</p>
      )}
    </div>
  );
}
```

## Integration in Existing Components

### Dashboard Integration
Add to your dashboard:
```tsx
import { WalletBalanceCard } from '../components/WalletBalanceCard';

// In your dashboard component
<WalletBalanceCard className="mb-6" />
```

### Settings Page Integration
Add to settings or profile pages:
```tsx
import { VerifyRZCButton } from '../components/VerifyRZCButton';

// In settings section
<div className="setting-item">
  <h3>RZC Balance Verification</h3>
  <p>Recover RZC from previous wallets</p>
  <VerifyRZCButton variant="outline" />
</div>
```

### Navigation Integration
Add to navigation or header:
```tsx
import { VerifyRZCButton } from '../components/VerifyRZCButton';

// In navigation
<VerifyRZCButton size="sm" showIcon={false} />
```

## Features

### ✅ Wallet Integration
- Automatically detects current wallet address
- Integrates with existing wallet context
- Uses current RZC balance for calculations

### ✅ Smart Discrepancy Calculation
- Automatically calculates difference between claimed and current balance
- Determines priority level based on discrepancy amount:
  - **Urgent**: >10,000 RZC difference
  - **High**: >1,000 RZC difference  
  - **Normal**: 100-1,000 RZC difference
  - **Low**: <100 RZC difference

### ✅ Verification Status Management
- Tracks active verification requests
- Shows request status and progress
- Displays admin notes and updates

### ✅ File Upload Support
- Screenshot upload for verification proof
- Secure file storage integration
- Progress indication during upload

### ✅ Manual Submission Fallback
- Provides manual submission instructions when automated submission fails
- Includes all necessary contact information
- Formats request details for easy copying

### ✅ Responsive Design
- Works on all screen sizes
- Mobile-friendly interface
- Accessible components

## Database Requirements

The system requires the following database functions to be set up:
- `submit_balance_verification_request()`
- `get_user_verification_status()`
- `get_user_balance_status()`
- `admin_update_verification_request_with_unlock()`

## Security Features

- RLS (Row Level Security) policies for data protection
- Secure file upload with validation
- Manual submission fallback for security compliance
- Admin-only functions for sensitive operations

## Testing

Test the integration with:
```javascript
// Test verification submission
const testData = {
  telegram_username: '@testuser',
  old_wallet_address: 'UQA...',
  claimed_balance: 5000,
  additional_notes: 'Test verification'
};

// This should work with any connected wallet
```

## Next Steps

1. **Add to Dashboard**: Integrate `WalletBalanceCard` in the main dashboard
2. **Settings Integration**: Add verification option to user settings
3. **Navigation**: Consider adding a verification status indicator
4. **Admin Panel**: Ensure admin panel can handle the new verification requests
5. **Testing**: Test with various wallet states and balances

## Support

For issues or questions about the wallet verification system:
- Check the component documentation
- Review the hook implementation
- Test with different wallet states
- Verify database functions are properly set up

The system is designed to be plug-and-play with your existing wallet infrastructure while providing a comprehensive verification experience for users.