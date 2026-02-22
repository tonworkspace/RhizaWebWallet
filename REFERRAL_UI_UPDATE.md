# Referral UI Update - Real Database Integration

## Overview
Updated the Referral page (`pages/Referral.tsx`) to use real Supabase database data instead of hardcoded mock values.

## Changes Made

### 1. Added Real Data Integration
- Imported `useWallet` hook to access `userProfile` and `referralData`
- Imported `supabaseService` to fetch referred users
- Added state management for `referredUsers` and `loading`

### 2. Dynamic Data Display

#### Rewards Overview
- **Total Rewards Earned**: Now displays `referralData.total_earned` (real TON earned)
- **Total Invites**: Shows `referralData.total_referrals` (actual referral count)
- **Conversion Rate**: Calculated from active vs total referred users

#### Referral Link
- Dynamically generated from `referralData.referral_code`
- Format: `{origin}/#/create-wallet?ref={referral_code}`
- Copy button disabled until referral code loads

#### Recent Referrals
- Fetches real referred users using `supabaseService.getReferredUsers()`
- Displays up to 5 most recent referrals
- Shows:
  - User avatar (emoji or default)
  - User name or wallet address (last 4 chars)
  - Time ago (calculated dynamically)
  - Active/Inactive status
  - Earnings (currently 0.00 TON - ready for future transaction tracking)

### 3. Loading States
- Shows "Loading..." while fetching data
- Empty state when no referrals exist
- Graceful handling of missing referral data

### 4. Helper Functions
- `getTimeAgo()`: Converts timestamps to human-readable format
  - "Just now", "5 mins ago", "2 hours ago", "Yesterday", "3 days ago", etc.

## Data Flow

```
WalletContext (login)
    ↓
Loads userProfile from Supabase
    ↓
Loads referralData from Supabase
    ↓
Referral Page receives data via useWallet()
    ↓
Fetches referred users via supabaseService
    ↓
Displays real statistics and user list
```

## Database Tables Used

1. **wallet_referrals**
   - `referral_code`: User's unique referral code
   - `total_earned`: Total TON earned from referrals
   - `total_referrals`: Count of referred users
   - `rank`: User's referral tier
   - `level`: User's referral level

2. **wallet_users**
   - Fetched via `getReferredUsers(referral_code)`
   - Filters users where `referrer_code` matches
   - Shows name, avatar, wallet_address, is_active, created_at

## Features

### Working Now
✅ Real referral code display
✅ Dynamic referral link generation
✅ Actual referral count
✅ Real conversion rate calculation
✅ List of referred users with details
✅ Active/Inactive status tracking
✅ Time-based sorting (most recent first)
✅ Loading states and empty states

### Ready for Future Enhancement
🔄 Transaction-based earnings calculation
🔄 Individual referral earnings tracking
🔄 Real-time updates via Supabase subscriptions
🔄 Referral tier progression tracking

## Testing

### Build Status
✅ TypeScript compilation: No errors
✅ Vite build: Successful (17.94s)
✅ No diagnostic issues

### Test Scenarios
1. **No Referral Data**: Shows loading state, then empty state
2. **With Referrals**: Displays real user list with stats
3. **Copy Link**: Copies actual referral link to clipboard
4. **Time Display**: Shows relative time for each referral

## Usage

Users can now:
1. See their real referral statistics
2. Copy their actual referral link
3. View list of users they've referred
4. Track active vs inactive referrals
5. Monitor conversion rates

## Next Steps (Optional Enhancements)

1. **Earnings Tracking**: Calculate actual TON earned per referral from transaction fees
2. **Real-time Updates**: Add Supabase subscriptions for live referral updates
3. **Tier Progression**: Show progress toward next referral tier
4. **Detailed Analytics**: Add charts for referral performance over time
5. **Referral Notifications**: Alert users when someone uses their code

## Files Modified
- `pages/Referral.tsx` - Complete rewrite with real data integration

## Dependencies
- `context/WalletContext.tsx` - Provides userProfile and referralData
- `services/supabaseService.ts` - Provides getReferredUsers() method
- Existing database schema (wallet_referrals, wallet_users tables)
