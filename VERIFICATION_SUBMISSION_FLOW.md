# Balance Verification Submission Flow

## Complete User Journey

### 1. User Clicks "Submit Balance Verification Request"

**Location:** `components/BalanceVerification.tsx`

The blue button opens a modal form with the following fields:
- Telegram Username (required)
- Current Wallet Address (auto-filled, read-only)
- Old Wallet Address (required)
- Claimed RZC Balance (required)
- Screenshot Upload (optional)
- Additional Notes (optional)

---

### 2. User Fills Form and Submits

**Handler:** `handleFormSubmit()` in BalanceVerification component

**Validation:**
```javascript
✓ Telegram username not empty
✓ Old wallet address not empty
✓ Claimed balance is a valid number
```

**Data Prepared:**
```javascript
{
  telegram_username: "@username",
  old_wallet_address: "EQA...",
  claimed_balance: 5000,
  screenshot_url: "optional_url",
  additional_notes: "optional notes"
}
```

---

### 3. Service Call: `submitVerificationRequestWithWallet()`

**Location:** `services/balanceVerificationService.ts`

#### Step 3.1: Verify User Profile
```javascript
const profileResult = await supabaseService.getProfile(walletAddress);
```

**If profile not found:**
- ❌ Return error: "User profile not found"
- User sees error toast

**If profile found:**
- ✅ Continue to RPC call

---

#### Step 3.2: Call Database RPC Function

**RPC Function:** `submit_balance_verification_request`

**Parameters sent to database:**
```sql
{
  p_telegram_username: "@username",
  p_old_wallet_address: "EQA...",
  p_claimed_balance: 5000,
  p_screenshot_url: "url or null",
  p_additional_notes: "notes or null"
}
```

---

### 4. Database Processing (RPC Function)

**What the database does:**

1. **Get current user from wallet_users table**
   - Uses authenticated user's ID
   - Retrieves current RZC balance

2. **Calculate discrepancy**
   ```sql
   discrepancy = claimed_balance - current_balance
   discrepancy_amount = ABS(discrepancy)
   ```

3. **Determine priority level**
   ```sql
   IF discrepancy_amount > 10000 THEN 'urgent'
   ELSIF discrepancy_amount > 1000 THEN 'high'
   ELSIF discrepancy_amount < 100 THEN 'low'
   ELSE 'normal'
   ```

4. **Check for existing pending request**
   - If exists: Return error "You already have a pending verification request"
   - If not: Continue

5. **Insert into balance_verification_requests table**
   ```sql
   INSERT INTO balance_verification_requests (
     user_id,
     telegram_username,
     old_wallet_address,
     claimed_balance,
     current_balance,
     discrepancy,
     priority,
     status,
     screenshot_url,
     additional_notes
   ) VALUES (
     user_id,
     '@username',
     'EQA...',
     5000,
     1000,
     4000,
     'high',
     'pending',
     'url',
     'notes'
   )
   ```

6. **Return success response**
   ```json
   {
     "success": true,
     "request_id": "uuid",
     "message": "Verification request submitted successfully",
     "priority": "high",
     "discrepancy_amount": 4000,
     "status": "pending"
   }
   ```

---

### 5. Two Possible Outcomes

#### ✅ Outcome A: Successful Submission

**Service returns:**
```javascript
{
  success: true,
  request_id: "uuid",
  message: "Verification request submitted successfully!",
  priority: "high",
  discrepancy_amount: 4000,
  final_status: "pending"
}
```

**UI Response:**
1. ✅ Success toast: "Verification request submitted successfully!"
2. 🔄 Form modal closes
3. 🔄 Refresh verification status
4. 📋 Blue status card appears showing:
   - "Verification Request Submitted"
   - Request ID (first 8 chars)
   - Claimed balance
   - Submission date
   - Status badge (PENDING)

**User sees:**
```
┌─────────────────────────────────────────┐
│ 📄 VERIFICATION REQUEST SUBMITTED       │
│                                         │
│ Status: PENDING                         │
│ Request ID: abc12345...                 │
│ Claimed: 5,000 RZC                      │
│ Submitted: Mar 13, 2026                 │
└─────────────────────────────────────────┘
```

---

#### ❌ Outcome B: RPC Fails (Manual Submission Required)

**Service returns:**
```javascript
{
  success: false,
  error: "detailed instructions...",
  isManualSubmissionRequired: true,
  verificationDetails: {
    wallet_address: "EQA...",
    user_id: "uuid",
    username: "John",
    current_balance: 1000,
    claimed_balance: 5000,
    discrepancy: 4000,
    discrepancy_amount: 4000,
    priority: "high"
  }
}
```

**UI Response:**
1. 🔄 Form modal closes
2. 📋 Manual submission modal opens with:
   - Contact information (email, Telegram)
   - User's request details
   - Priority level
   - Expected response time
   - "Copy Details" button

**User sees:**
```
┌─────────────────────────────────────────┐
│ ⚠️  MANUAL SUBMISSION REQUIRED          │
│                                         │
│ 📧 Contact Information:                 │
│ • Email: support@rhiza.com              │
│ • Telegram: @RhizaSupport               │
│                                         │
│ 📋 Your Request Details:                │
│ • Wallet: EQA...                        │
│ • Current Balance: 1,000 RZC            │
│ • Claimed Balance: 5,000 RZC            │
│ • Discrepancy: +4,000 RZC               │
│ • Priority: HIGH                        │
│                                         │
│ ⏱️ Expected Response: 12-24 hours       │
│                                         │
│ [Copy Details] [Close]                  │
└─────────────────────────────────────────┘
```

---

### 6. Admin Review Process

**Admin Dashboard:** `pages/AdminDashboard.tsx`

Admins can see all verification requests and:

1. **View request details**
   - User information
   - Claimed vs current balance
   - Discrepancy amount
   - Priority level
   - Screenshot (if provided)
   - Additional notes

2. **Take action:**
   - ✅ **Approve:** Credit the difference to user's account
   - ❌ **Reject:** Deny the request with reason
   - 📝 **Add notes:** Provide feedback to user

3. **Status changes:**
   - `pending` → `under_review` (admin viewing)
   - `under_review` → `approved` (admin approves)
   - `approved` → `resolved` (RZC credited)
   - `under_review` → `rejected` (admin rejects)

---

### 7. After Admin Approval

**What happens when admin approves:**

1. **RZC Balance Updated**
   ```sql
   UPDATE wallet_users
   SET rzc_balance = rzc_balance + discrepancy
   WHERE id = user_id
   ```

2. **Transaction Record Created**
   ```sql
   INSERT INTO rzc_transactions (
     user_id,
     amount,
     type,
     balance_after
   ) VALUES (
     user_id,
     4000,
     'migration',
     5000
   )
   ```

3. **Balance Unlocked**
   ```sql
   UPDATE wallet_users
   SET 
     balance_verified = true,
     balance_locked = false,
     can_send_rzc = true,
     verification_badge_earned_at = NOW()
   WHERE id = user_id
   ```

4. **Request Status Updated**
   ```sql
   UPDATE balance_verification_requests
   SET 
     status = 'resolved',
     resolved_at = NOW(),
     resolved_by = admin_id
   WHERE id = request_id
   ```

---

### 8. User Sees Completion

**UI Updates automatically (on refresh):**

1. **Verification Badge appears** 🏆
   - Green shield icon
   - "Verified" label
   - Shows verification level

2. **Status card updates:**
   ```
   ┌─────────────────────────────────────────┐
   │ 👑 VERIFICATION COMPLETE!               │
   │                                         │
   │ Your balance is now unlocked and you've │
   │ earned a verification badge!            │
   └─────────────────────────────────────────┘
   ```

3. **Balance card shows:**
   - Updated RZC balance (5,000 RZC)
   - Green "Unlocked" status
   - "RZC Transfers: Enabled"

4. **Verification progress:**
   - All steps marked complete ✓
   - Green "Verified" badge

---

## Summary Flow Chart

```
User Clicks Button
       ↓
Fills Form
       ↓
Submits Form
       ↓
Service Validates
       ↓
    ┌──────┴──────┐
    ↓             ↓
RPC Success   RPC Fails
    ↓             ↓
Database      Manual
Inserts       Instructions
Request       Modal
    ↓             ↓
Status Card   User Contacts
Shows         Support
"Pending"         ↓
    ↓         Support
Admin         Creates
Reviews       Request
    ↓             ↓
    └──────┬──────┘
           ↓
    Admin Approves
           ↓
    RZC Credited
           ↓
    Balance Unlocked
           ↓
    Badge Earned
           ↓
    User Verified ✅
```

---

## Key Features

✅ **Automatic submission** via database RPC function
✅ **Fallback to manual** if RPC fails
✅ **Priority-based processing** (urgent, high, normal, low)
✅ **Duplicate prevention** (one pending request per user)
✅ **Admin review workflow** with notes
✅ **Automatic balance unlock** on approval
✅ **Verification badge** reward
✅ **Transaction history** tracking
✅ **Real-time status updates**

---

## Database Tables Involved

1. **wallet_users** - User profiles and balances
2. **balance_verification_requests** - Verification requests
3. **rzc_transactions** - Transaction history
4. **verification_badges** - Badge records (if separate table exists)

---

## Security Features

🔒 **RLS Policies** - Row-level security on all tables
🔒 **Authenticated users only** - Must be logged in
🔒 **Duplicate prevention** - One pending request per user
🔒 **Admin-only approval** - Only admins can approve/reject
🔒 **Audit trail** - All actions logged with timestamps
