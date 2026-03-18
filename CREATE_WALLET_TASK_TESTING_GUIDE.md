# Create Wallet Task - Testing Guide

## Overview

The "Create RhizaCore Wallet" task is the first and highest-reward task (150 RZC) in the airdrop system. It should automatically complete when a user is logged in, since having access to the dashboard means they have successfully created/connected a wallet.

## How It Works

### 1. Auto-Completion Logic

The task uses multiple layers of verification:

**Primary Method (Real-time):**
- Uses `airdropService.getTaskStatus()` to check wallet creation
- Calls `airdropService.verifyWalletCreation()` which checks if user profile exists in database
- If successful, marks task as completed

**Fallback Method (Immediate):**
- If real-time service fails, falls back to basic check
- If `userProfile` and `address` exist in wallet context, task is completed
- This ensures the task works even if database is unavailable

**Immediate Check (Component Mount):**
- Additional useEffect that immediately checks on component mount
- If user is logged in (`userProfile` and `address` exist), task is completed
- Provides instant feedback without waiting for async operations

### 2. Verification Process

```typescript
// Real-time verification
async verifyWalletCreation(walletAddress: string): Promise<boolean> {
  const profileResult = await supabaseService.getProfile(walletAddress);
  return profileResult.success && !!profileResult.data;
}

// Fallback verification
if (userProfile && address) {
  // Task is completed - user is logged in
  return true;
}
```

### 3. Task Completion Flow

1. **User logs in** → Wallet context is populated
2. **Dashboard loads** → Airdrop component mounts
3. **Immediate check** → If logged in, task completes instantly
4. **Real-time check** → Verifies against database
5. **Reward awarded** → 150 RZC credited to user account

## Testing Methods

### Method 1: Automated Browser Test

1. Navigate to the dashboard page
2. Open browser console (F12)
3. Copy and paste the contents of `test_create_wallet_manual.js`
4. The test will run automatically and show results

**Expected Output:**
```
✅ Wallet Address: EQxxxxx...
✅ Create Wallet Task should be COMPLETED
💰 Reward: 150 RZC should be available
```

### Method 2: Manual UI Testing

1. **Login Check:**
   - Ensure you are logged in to RhizaCore
   - Check that wallet address is visible in UI
   - Verify user profile is loaded

2. **Navigate to Airdrop:**
   - Go to Dashboard
   - Look for "Social Airdrop" widget
   - Click to open full airdrop dashboard

3. **Check Task Status:**
   - Look for "Create RhizaCore Wallet" task
   - Should show as completed (✅) with green background
   - Should display "+150 RZC earned"

4. **Verify Button Test:**
   - If task shows as incomplete, click "Verify" button
   - Should immediately complete and show success message
   - RZC balance should increase by 150

### Method 3: Console Commands

Run these commands in browser console:

```javascript
// Test wallet context
console.log('Wallet Address:', localStorage.getItem('wallet_address'));

// Test task status
testCreateWallet.test();

// Simulate completion
testCreateWallet.simulate();

// Check UI status
testCreateWallet.checkStatus();
```

## Troubleshooting

### Issue: Task Not Auto-Completing

**Possible Causes:**
1. User not properly logged in
2. Wallet context not loaded
3. Database connection issues
4. Component not mounting properly

**Solutions:**
1. **Refresh the page** - Reloads wallet context
2. **Check login status** - Ensure wallet is connected
3. **Manual verification** - Click "Verify" button
4. **Check console** - Look for error messages

### Issue: Verification Fails

**Possible Causes:**
1. Supabase connection issues
2. User profile not found in database
3. Invalid wallet address format

**Solutions:**
1. **Check network connection**
2. **Verify database setup** - Run `create_airdrop_system.sql`
3. **Check wallet address format** - Should be valid TON address
4. **Use fallback method** - Should work even if database fails

### Issue: Reward Not Awarded

**Possible Causes:**
1. Task already completed previously
2. Database function errors
3. RZC system not configured

**Solutions:**
1. **Check completion history** - Look for duplicate completions
2. **Verify database functions** - Ensure `record_airdrop_completion` exists
3. **Check RZC system** - Ensure `award_rzc_tokens` function works

## Expected Behavior

### For New Users (First Time)
1. User creates wallet and logs in
2. Navigates to dashboard
3. Task automatically completes
4. Success message shows: "Task 'Create RhizaCore Wallet' verified! +150 RZC earned"
5. Task shows as completed with green checkmark
6. RZC balance increases by 150

### For Existing Users (Already Completed)
1. User logs in and navigates to dashboard
2. Task shows as already completed
3. No additional reward given (duplicate prevention)
4. Task displays "✅ Completed +150 RZC"

### For Logged Out Users
1. Task shows as incomplete
2. Clicking task button shows info message
3. User must log in first
4. After login, task auto-completes

## Debug Information

### Console Logs to Look For

**Successful Verification:**
```
🔍 Verifying wallet creation for: EQxxxxx...
📊 Profile result: {success: true, data: {...}}
✅ Wallet creation verified successfully
```

**Failed Verification:**
```
❌ Wallet verification failed: No wallet address provided
❌ Wallet creation verification failed: No profile found
```

**Task Completion:**
```
✅ Task "Create RhizaCore Wallet" verified! +150 RZC earned
```

### Database Queries to Check

```sql
-- Check if user profile exists
SELECT * FROM profiles WHERE wallet_address = 'EQxxxxx...';

-- Check task completion
SELECT * FROM airdrop_task_completions 
WHERE wallet_address = 'EQxxxxx...' AND task_action = 'create_wallet';

-- Check RZC balance
SELECT rzc_balance FROM profiles WHERE wallet_address = 'EQxxxxx...';
```

## Performance Notes

- **Immediate completion** for better UX (no waiting)
- **Fallback mechanisms** ensure reliability
- **Duplicate prevention** via database constraints
- **Error handling** with user-friendly messages

## Security Features

- **Wallet address validation** (TON format)
- **Database-level duplicate prevention**
- **Row-level security** (users can only see their own data)
- **Input sanitization** for all parameters

## Integration Points

- **Wallet Context** - Uses existing user profile and address
- **Supabase Service** - Leverages existing database functions
- **RZC System** - Integrates with existing token rewards
- **Notification System** - Uses existing toast notifications

The create wallet task should work seamlessly for all logged-in users and provide immediate feedback with proper error handling and fallback mechanisms.