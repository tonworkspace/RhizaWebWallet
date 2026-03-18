# 📧 Supabase Email Confirmation Setup

## Important: Disable Email Confirmation

For the wallet authentication fix to work properly, you need to **disable email confirmation** in your Supabase project.

## Why?

The wallet auth creates accounts with generated emails like `{wallet_address}@rhiza.wallet`. These are not real email addresses, so:

- ❌ Email confirmation would fail (no real inbox)
- ❌ Users would be stuck waiting for confirmation
- ✅ We want instant authentication when logging in with wallet

## How to Disable Email Confirmation

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Providers** → **Email**
3. Find the setting **"Confirm email"**
4. **Uncheck** or **Disable** this option
5. Click **Save**

### Option 2: Supabase CLI

If you're using Supabase CLI, update your `config.toml`:

```toml
[auth.email]
enable_signup = true
double_confirm_changes = false
enable_confirmations = false  # ← Set this to false
```

Then apply the config:

```bash
supabase db push
```

### Option 3: SQL (If needed)

You can also update the auth config directly in SQL:

```sql
-- Check current setting
SELECT * FROM auth.config WHERE name = 'MAILER_AUTOCONFIRM';

-- Enable auto-confirm (disable email confirmation)
UPDATE auth.config 
SET value = 'true' 
WHERE name = 'MAILER_AUTOCONFIRM';
```

## Verify It's Working

After disabling email confirmation, test by:

1. Log out from your wallet
2. Log in again
3. Check browser console for: `✅ Supabase auth session created`
4. Run this in console:

```javascript
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session);
console.log('Email confirmed:', session?.user?.email_confirmed_at);
```

If `email_confirmed_at` has a timestamp, it's working!

## Alternative: Use Real Emails (Not Recommended)

If you want to keep email confirmation enabled, you would need to:

1. Collect real email addresses from users
2. Send confirmation emails
3. Wait for users to confirm
4. Then create the wallet association

This adds friction to the user experience and is not recommended for wallet-based authentication.

## Security Considerations

**Q: Is it safe to disable email confirmation?**

A: Yes, because:
- Users authenticate with their wallet (mnemonic/private key)
- The wallet itself is the authentication factor
- Email is only used as a unique identifier for Supabase auth
- RLS policies still protect all data access
- The generated password includes wallet address + secret

**Q: What if someone guesses the email format?**

A: They would also need to:
- Know the wallet address
- Know the auth secret (environment variable)
- Generate the correct password
- Even then, RLS policies limit what they can access

## Current Configuration

The fix assumes email confirmation is **disabled**. If you see errors like:

- "Email not confirmed"
- "Please check your email"
- "Confirmation required"

Then email confirmation is still enabled and needs to be disabled.

## Testing Checklist

- [ ] Email confirmation disabled in Supabase dashboard
- [ ] Can log in with wallet without email confirmation
- [ ] Auth session created successfully
- [ ] Verification request submission works
- [ ] No "check your email" messages

---

**Status**: ⚠️ CONFIGURATION REQUIRED

**Action Required**: Disable email confirmation in Supabase project settings

**Priority**: HIGH - Required for wallet auth fix to work
