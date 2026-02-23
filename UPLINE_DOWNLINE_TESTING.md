# Upline/Downline Feature - Testing Guide

## ✅ Database Schema Verification

### Current Schema Status

The database schema **already supports** the upline/downline feature:

**wallet_referrals table:**
```sql
CREATE TABLE wallet_referrals (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE,              -- This user
  referrer_id UUID,                 -- ✅ Who referred this user (UPLINE)
  referral_code TEXT UNIQUE,        -- This user's code to share
  total_earned NUMERIC(20, 4),
  total_referrals INTEGER,
  rank TEXT,
  level INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Key Fields:**
- `user_id`: The user who owns this referral record
- `referrer_id`: **The user who referred them (their upline)**
- `referral_code`: Their unique code to share with others

**Indexes:**
```sql
CREATE INDEX idx_wallet_referrals_user ON wallet_referrals(user_id);
CREATE INDEX idx_wallet_referrals_referrer ON wallet_referrals(referrer_id); -- ✅ For upline queries
CREATE INDEX idx_wallet_referrals_code ON wallet_referrals(referral_code);
```

### Schema Verification ✅

**Status:** No schema changes needed!

The existing schema already has:
- ✅ `referrer_id` field in `wallet_referrals`
- ✅ Index on `referrer_id` for fast queries
- ✅ `referrer_code` field in `wallet_users`
- ✅ All necessary relationships

---

## 🧪 Testing Checklist

### 1. Database Schema Test

```sql
-- Verify referrer_id column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'wallet_referrals' 
  AND column_name = 'referrer_id';

-- Expected result:
-- column_name  | data_type
-- referrer_id  | uuid

-- Verify index exists
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'wallet_referrals' 
  AND indexname = 'idx_wallet_referrals_referrer';

-- Expected result:
-- indexname
-- idx_wallet_referrals_referrer
```

**Status:** ✅ Schema is ready

---

### 2. Create Test Users

```sql
-- User A (Top level - no referrer)
INSERT INTO wallet_users (id, wallet_address, name, avatar, referrer_code)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'EQA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0',
  'Alice Johnson',
  '👤',
  NULL
);

INSERT INTO wallet_referrals (user_id, referrer_id, referral_code)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  NULL,  -- No referrer
  'A1B2C3D4'
);

-- User B (Referred by User A)
INSERT INTO wallet_users (id, wallet_address, name, avatar, referrer_code)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'EQB2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T1',
  'Bob Smith',
  '🌱',
  'A1B2C3D4'  -- Referred by Alice
);

INSERT INTO wallet_referrals (user_id, referrer_id, referral_code)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',  -- Alice is referrer
  'B2C3D4E5'
);

-- User C (Referred by User B)
INSERT INTO wallet_users (id, wallet_address, name, avatar, referrer_code)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  'EQC3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T2',
  'Carol Davis',
  '🚀',
  'B2C3D4E5'  -- Referred by Bob
);

INSERT INTO wallet_referrals (user_id, referrer_id, referral_code)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  '22222222-2222-2222-2222-222222222222',  -- Bob is referrer
  'C3D4E5F6'
);
```

**Network Structure:**
```
Alice (A1B2C3D4)
  └─> Bob (B2C3D4E5)
       └─> Carol (C3D4E5F6)
```

---

### 3. Test Upline Queries

**Test 1: Get Alice's Upline (should be NULL)**
```sql
SELECT 
  u.name as user_name,
  upline.name as upline_name
FROM wallet_users u
JOIN wallet_referrals r ON u.id = r.user_id
LEFT JOIN wallet_users upline ON r.referrer_id = upline.id
WHERE u.id = '11111111-1111-1111-1111-111111111111';

-- Expected:
-- user_name      | upline_name
-- Alice Johnson  | NULL
```

**Test 2: Get Bob's Upline (should be Alice)**
```sql
SELECT 
  u.name as user_name,
  upline.name as upline_name,
  upline.wallet_address as upline_address
FROM wallet_users u
JOIN wallet_referrals r ON u.id = r.user_id
LEFT JOIN wallet_users upline ON r.referrer_id = upline.id
WHERE u.id = '22222222-2222-2222-2222-222222222222';

-- Expected:
-- user_name  | upline_name    | upline_address
-- Bob Smith  | Alice Johnson  | EQA1B2C3...
```

**Test 3: Get Carol's Upline (should be Bob)**
```sql
SELECT 
  u.name as user_name,
  upline.name as upline_name
FROM wallet_users u
JOIN wallet_referrals r ON u.id = r.user_id
LEFT JOIN wallet_users upline ON r.referrer_id = upline.id
WHERE u.id = '33333333-3333-3333-3333-333333333333';

-- Expected:
-- user_name    | upline_name
-- Carol Davis  | Bob Smith
```

---

### 4. Test Downline Queries

**Test 1: Get Alice's Downline (should be Bob only)**
```sql
SELECT 
  u.name,
  u.wallet_address,
  u.is_active,
  r.total_referrals,
  u.created_at
FROM wallet_referrals r
JOIN wallet_users u ON r.user_id = u.id
WHERE r.referrer_id = '11111111-1111-1111-1111-111111111111'
ORDER BY u.created_at DESC;

-- Expected:
-- name       | wallet_address | is_active | total_referrals
-- Bob Smith  | EQB2C3D4...    | true      | 0
```

**Test 2: Get Bob's Downline (should be Carol only)**
```sql
SELECT 
  u.name,
  u.wallet_address,
  u.is_active,
  r.total_referrals
FROM wallet_referrals r
JOIN wallet_users u ON r.user_id = u.id
WHERE r.referrer_id = '22222222-2222-2222-2222-222222222222'
ORDER BY u.created_at DESC;

-- Expected:
-- name         | wallet_address | is_active | total_referrals
-- Carol Davis  | EQC3D4E5...    | true      | 0
```

**Test 3: Get Carol's Downline (should be empty)**
```sql
SELECT 
  u.name,
  u.wallet_address
FROM wallet_referrals r
JOIN wallet_users u ON r.user_id = u.id
WHERE r.referrer_id = '33333333-3333-3333-3333-333333333333';

-- Expected:
-- (empty result set)
```

---

### 5. Test Service Methods

**Test getUpline() method:**
```typescript
// Test 1: User with no upline
const aliceUpline = await supabaseService.getUpline('11111111-1111-1111-1111-111111111111');
console.log('Alice upline:', aliceUpline.data); // Should be null

// Test 2: User with upline
const bobUpline = await supabaseService.getUpline('22222222-2222-2222-2222-222222222222');
console.log('Bob upline:', bobUpline.data?.name); // Should be "Alice Johnson"

// Test 3: Another user with upline
const carolUpline = await supabaseService.getUpline('33333333-3333-3333-3333-333333333333');
console.log('Carol upline:', carolUpline.data?.name); // Should be "Bob Smith"
```

**Test getDownline() method:**
```typescript
// Test 1: User with downline
const aliceDownline = await supabaseService.getDownline('11111111-1111-1111-1111-111111111111');
console.log('Alice downline count:', aliceDownline.data?.length); // Should be 1
console.log('Alice downline:', aliceDownline.data?.[0]?.name); // Should be "Bob Smith"

// Test 2: User with downline
const bobDownline = await supabaseService.getDownline('22222222-2222-2222-2222-222222222222');
console.log('Bob downline count:', bobDownline.data?.length); // Should be 1
console.log('Bob downline:', bobDownline.data?.[0]?.name); // Should be "Carol Davis"

// Test 3: User with no downline
const carolDownline = await supabaseService.getDownline('33333333-3333-3333-3333-333333333333');
console.log('Carol downline count:', carolDownline.data?.length); // Should be 0
```

---

### 6. Test UI Display

**Test Referral Page:**

1. **Login as Alice:**
   - Upline section: Should be hidden (no upline)
   - Downline section: Should show Bob Smith
   - Downline count: 1 Member

2. **Login as Bob:**
   - Upline section: Should show Alice Johnson
   - Downline section: Should show Carol Davis
   - Downline count: 1 Member

3. **Login as Carol:**
   - Upline section: Should show Bob Smith
   - Downline section: Should show empty state
   - Downline count: 0 Members

---

### 7. Test Referral Flow

**Complete User Journey Test:**

```bash
# Step 1: User A creates wallet (no referral code)
1. Navigate to /create-wallet
2. Complete wallet creation
3. Check database:
   - wallet_users: referrer_code should be NULL
   - wallet_referrals: referrer_id should be NULL

# Step 2: User A gets referral code
1. Navigate to /wallet/referral
2. Copy referral link (e.g., rhiza.core/join?ref=A1B2C3D4)
3. Verify code is displayed correctly

# Step 3: User B creates wallet with User A's code
1. Navigate to /create-wallet?ref=A1B2C3D4
2. Complete wallet creation
3. Check database:
   - wallet_users: referrer_code should be 'A1B2C3D4'
   - wallet_referrals: referrer_id should be User A's ID

# Step 4: Verify upline/downline visibility
1. Login as User A:
   - Downline should show User B
2. Login as User B:
   - Upline should show User A
   - Downline should be empty
```

---

### 8. Test Edge Cases

**Test 1: User with no referrer_id**
```sql
-- Create user without referrer
INSERT INTO wallet_referrals (user_id, referrer_id, referral_code)
VALUES (
  '44444444-4444-4444-4444-444444444444',
  NULL,
  'D4E5F6G7'
);

-- Query upline (should return null)
SELECT * FROM wallet_users 
WHERE id = (
  SELECT referrer_id FROM wallet_referrals 
  WHERE user_id = '44444444-4444-4444-4444-444444444444'
);
```

**Test 2: Invalid referrer_id**
```sql
-- Try to create referral with non-existent referrer
INSERT INTO wallet_referrals (user_id, referrer_id, referral_code)
VALUES (
  '55555555-5555-5555-5555-555555555555',
  '99999999-9999-9999-9999-999999999999',  -- Doesn't exist
  'E5F6G7H8'
);

-- Should fail or return null when querying upline
```

**Test 3: Circular reference prevention**
```sql
-- User A refers User B
-- User B tries to refer User A (should be prevented by logic)
-- This is prevented at application level, not database level
```

---

### 9. Performance Tests

**Test Query Performance:**
```sql
-- Test upline query performance
EXPLAIN ANALYZE
SELECT u.*
FROM wallet_users u
JOIN wallet_referrals r ON u.id = r.referrer_id
WHERE r.user_id = '22222222-2222-2222-2222-222222222222';

-- Should use index: idx_wallet_referrals_referrer

-- Test downline query performance
EXPLAIN ANALYZE
SELECT u.*
FROM wallet_referrals r
JOIN wallet_users u ON r.user_id = u.id
WHERE r.referrer_id = '11111111-1111-1111-1111-111111111111';

-- Should use index: idx_wallet_referrals_referrer
```

---

### 10. Integration Tests

**Test Complete Referral System:**

```typescript
// Test 1: Create wallet with referral code
const testReferralFlow = async () => {
  // User A creates wallet
  const userA = await createTestWallet('Alice', null);
  
  // Get User A's referral code
  const referralData = await supabaseService.getReferralData(userA.id);
  const referralCode = referralData.data?.referral_code;
  
  // User B creates wallet with User A's code
  const userB = await createTestWallet('Bob', referralCode);
  
  // Verify upline/downline
  const bobUpline = await supabaseService.getUpline(userB.id);
  const aliceDownline = await supabaseService.getDownline(userA.id);
  
  console.assert(bobUpline.data?.id === userA.id, 'Bob upline should be Alice');
  console.assert(aliceDownline.data?.[0]?.id === userB.id, 'Alice downline should include Bob');
};
```

---

## 📊 Expected Results Summary

### Database Relationships

```
User A (Alice)
├─ referrer_id: NULL
├─ referral_code: A1B2C3D4
└─ Downline: [Bob]

User B (Bob)
├─ referrer_id: Alice's ID
├─ referral_code: B2C3D4E5
├─ Upline: Alice
└─ Downline: [Carol]

User C (Carol)
├─ referrer_id: Bob's ID
├─ referral_code: C3D4E5F6
├─ Upline: Bob
└─ Downline: []
```

### UI Display

**Alice's View:**
- Upline: Hidden (no upline)
- Downline: Shows Bob (1 member)

**Bob's View:**
- Upline: Shows Alice
- Downline: Shows Carol (1 member)

**Carol's View:**
- Upline: Shows Bob
- Downline: Empty state (0 members)

---

## ✅ Verification Checklist

- [ ] Database schema has `referrer_id` field
- [ ] Index on `referrer_id` exists
- [ ] `getUpline()` method works correctly
- [ ] `getDownline()` method works correctly
- [ ] Upline section displays correctly
- [ ] Downline section displays correctly
- [ ] Empty states work properly
- [ ] Referral code linking works
- [ ] RZC rewards awarded correctly
- [ ] Performance is acceptable

---

## 🚀 Production Readiness

**Schema Status:** ✅ Ready (no changes needed)  
**Service Methods:** ✅ Implemented  
**UI Components:** ✅ Implemented  
**Testing:** ⏳ Pending user testing  

**Next Steps:**
1. Test with real users
2. Monitor query performance
3. Gather user feedback
4. Consider multi-level view (future)

---

**Last Updated:** February 23, 2026  
**Status:** Ready for Testing

