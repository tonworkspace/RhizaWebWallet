# 🔧 Balance Verification Authentication Fix

## Problem Identified

The balance verification form is failing because:

1. **Users log in with TON wallet** (mnemonic-based) but this doesn't create a Supabase auth session
2. **RPC function requires authentication** - `submit_balance_verification_request` uses `auth.jwt()` to identify the user
3. **No JWT token exists** - Since there's no Supabase auth session, the RPC function can't find the user
4. **Fallback to manual submission** - The service catches the error and shows manual submission instructions

## Current Flow

```
User logs in with TON wallet
  ↓
WalletContext stores wallet address locally
  ↓
No Supabase auth session created
  ↓
User tries to submit verification
  ↓
RPC function called: submit_balance_verification_request()
  ↓
Function tries to get user from JWT: auth.jwt()
  ↓
JWT is NULL or doesn't contain wallet_address
  ↓
Function returns error
  ↓
Service shows manual submission modal
```

## Solutions

### Option 1: Create Supabase Auth Session on Wallet Login (RECOMMENDED)

Modify `WalletContext` to create a Supabase auth session when user logs in with wallet:

```typescript
// In WalletContext.tsx login function
if (res.success && res.address) {
  // ... existing code ...
  
  // Create Supabase auth session for wallet user
  const authResult = await authService.signInWithWallet(res.address);
  if (!authResult.success) {
    console.warn('⚠️ Failed to create Supabase auth session:', authResult.error);
  }
}
```

### Option 2: Make RPC Function Work Without Auth

Create a new RPC function that accepts wallet_address as a parameter:

```sql
CREATE OR REPLACE FUNCTION submit_balance_verification_request_by_wallet(
  p_wallet_address TEXT,
  p_telegram_username TEXT,
  p_old_wallet_address TEXT,
  p_claimed_balance DECIMAL(20,2),
  p_screenshot_url TEXT DEFAULT NULL,
  p_additional_notes TEXT DEFAULT NULL
) RETURNS JSON AS $func$
-- Function body that looks up user by wallet_address instead of JWT
$func$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Option 3: Direct Database Insert (CURRENT WORKAROUND)

The service already has a fallback that shows manual submission instructions. This works but requires manual admin intervention.

## Recommended Fix

Implement **Option 1** - it's the cleanest solution that:
- ✅ Maintains security (proper authentication)
- ✅ Works with existing RPC functions
- ✅ Enables all authenticated features (not just verification)
- ✅ Minimal code changes

## Implementation Steps

1. Update `WalletContext.tsx` to create Supabase auth session on login
2. Handle auth errors gracefully (wallet login should still work even if Supabase auth fails)
3. Test verification submission with authenticated session
4. Verify other features that require auth also work

## Files to Modify

- `context/WalletContext.tsx` - Add Supabase auth on wallet login
- `services/authService.ts` - May need to add a method for wallet-based auth without email

## Testing

After implementing the fix:

1. Log in with wallet
2. Check browser console for Supabase auth session
3. Try submitting verification request
4. Should succeed without showing manual submission modal
