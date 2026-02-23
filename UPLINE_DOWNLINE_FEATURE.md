# Upline/Downline Network Visibility Feature

## Overview

Users can now see their complete referral network with two-way visibility:
- **Upline**: Who referred them (their sponsor)
- **Downline**: Who they referred (their team)

This creates transparency and helps users understand their position in the referral network.

---

## 🎯 Features

### 1. Upline Display (Who Referred Me)

Shows the person who referred you to the platform:

```
┌─────────────────────────────────────┐
│ My Upline                           │
├─────────────────────────────────────┤
│ 👤 Alice Johnson                    │
│    Referred you • EQA1...C3D4       │
│                          Upline     │
│                      Your Sponsor   │
└─────────────────────────────────────┘
```

**Information Shown:**
- Avatar
- Name
- Wallet address (truncated)
- "Upline" badge
- "Your Sponsor" label

**When Displayed:**
- Only shown if user was referred by someone
- Hidden if user signed up without a referral code

### 2. Downline Display (Who I Referred)

Shows all users you've referred to the platform:

```
┌─────────────────────────────────────┐
│ My Downline              5 Members  │
├─────────────────────────────────────┤
│ 🌱 Bob Smith                        │
│    2 hours ago • 3 refs    Active   │
│                         1,250 RZC   │
├─────────────────────────────────────┤
│ 🚀 Carol Davis                      │
│    1 day ago • 0 refs      Active   │
│                           150 RZC   │
├─────────────────────────────────────┤
│ 💎 Dave Wilson                      │
│    3 days ago • 1 ref    Inactive   │
│                           200 RZC   │
└─────────────────────────────────────┘
```

**Information Shown:**
- Avatar
- Name
- Time since joined
- Number of their referrals (if any)
- Active/Inactive status
- RZC balance
- Total count in header

**When Displayed:**
- Always visible (shows empty state if no referrals)
- Sorted by most recent first

---

## 🔧 Technical Implementation

### Database Structure

The relationship is stored in two tables:

**wallet_users table:**
```sql
CREATE TABLE wallet_users (
  id UUID PRIMARY KEY,
  wallet_address TEXT UNIQUE,
  name TEXT,
  avatar TEXT,
  referrer_code TEXT,  -- Code of person who referred THIS user
  ...
);
```

**wallet_referrals table:**
```sql
CREATE TABLE wallet_referrals (
  id UUID PRIMARY KEY,
  user_id UUID,        -- This user
  referrer_id UUID,    -- Who referred this user (upline)
  referral_code TEXT,  -- This user's code to share
  total_referrals INT, -- Count of downline
  ...
);
```

### New Service Methods

**1. Get Upline (supabaseService.ts)**

```typescript
async getUpline(userId: string): Promise<{
  success: boolean;
  data?: UserProfile | null;
  error?: string;
}> {
  // 1. Get user's referral data to find referrer_id
  const referralData = await this.client
    .from('wallet_referrals')
    .select('referrer_id')
    .eq('user_id', userId)
    .single();

  // 2. If no referrer, return null
  if (!referralData?.referrer_id) {
    return { success: true, data: null };
  }

  // 3. Get referrer's profile
  const uplineProfile = await this.client
    .from('wallet_users')
    .select('*')
    .eq('id', referralData.referrer_id)
    .single();

  return { success: true, data: uplineProfile };
}
```

**2. Get Downline (supabaseService.ts)**

```typescript
async getDownline(userId: string): Promise<{
  success: boolean;
  data?: Array<UserProfile & { total_referrals?: number }>;
  error?: string;
}> {
  // Get all users who have this user as their referrer
  const downlineData = await this.client
    .from('wallet_referrals')
    .select(`
      user_id,
      total_referrals,
      wallet_users!inner (*)
    `)
    .eq('referrer_id', userId)
    .order('created_at', { ascending: false });

  // Transform and return
  return { success: true, data: transformedData };
}
```

### UI Implementation (Referral.tsx)

```typescript
const [upline, setUpline] = useState<any | null>(null);
const [downline, setDownline] = useState<any[]>([]);

useEffect(() => {
  loadReferralNetwork();
}, [userProfile]);

const loadReferralNetwork = async () => {
  if (!userProfile?.id) return;

  // Load upline
  const uplineResult = await supabaseService.getUpline(userProfile.id);
  if (uplineResult.success && uplineResult.data) {
    setUpline(uplineResult.data);
  }

  // Load downline
  const downlineResult = await supabaseService.getDownline(userProfile.id);
  if (downlineResult.success && downlineResult.data) {
    setDownline(downlineResult.data);
  }
};
```

---

## 📊 User Experience Flow

### Scenario 1: User A (No Upline)

```
User A creates wallet without referral code
└─> Upline section: Hidden (no upline)
└─> Downline section: Empty state "No downline yet"
```

### Scenario 2: User A Refers User B

```
User A shares referral link
└─> User B signs up with code
    └─> User A's downline: Shows User B
    └─> User B's upline: Shows User A
```

### Scenario 3: Multi-Level Network

```
User A (Top)
├─> Refers User B
│   └─> User B's upline: User A
│   └─> User B refers User C
│       └─> User C's upline: User B
│       └─> User B's downline: User C
└─> User A's downline: User B only (direct referrals)
```

**Note:** Currently shows only direct referrals (1 level deep). Multi-level display can be added in future.

---

## 🎨 UI Design

### Upline Card
- **Color Scheme**: Blue accent (different from downline's green)
- **Badge**: "Upline" with "Your Sponsor" subtitle
- **Size**: Slightly larger avatar (10x10 vs 9x9)
- **Border**: Blue border to distinguish from downline

### Downline Card
- **Color Scheme**: Green accent (#00FF88)
- **Status Indicator**: Active (green) / Inactive (gray)
- **Additional Info**: Shows their referral count and RZC balance
- **Interactive**: Hover effect for better UX

### Empty States
- **No Upline**: Section hidden completely
- **No Downline**: Shows friendly message with icon
  - "No downline yet"
  - "Share your link to build your network!"

---

## 🔍 Data Displayed

### Upline Information
| Field | Description | Example |
|-------|-------------|---------|
| Avatar | Emoji avatar | 👤 |
| Name | Display name | Alice Johnson |
| Wallet Address | Truncated address | EQA1...C3D4 |
| Label | Relationship label | Your Sponsor |

### Downline Information
| Field | Description | Example |
|-------|-------------|---------|
| Avatar | Emoji avatar | 🌱 |
| Name | Display name | Bob Smith |
| Join Time | Time since joined | 2 hours ago |
| Referrals | Their referral count | 3 refs |
| Status | Active/Inactive | Active |
| RZC Balance | Current RZC tokens | 1,250 RZC |

---

## 🚀 Benefits

### For Users
1. **Transparency**: See who referred them
2. **Network Building**: Track their team growth
3. **Motivation**: See active vs inactive members
4. **Recognition**: Acknowledge their sponsor
5. **Progress Tracking**: Monitor downline performance

### For Platform
1. **Engagement**: Users check their network regularly
2. **Trust**: Transparency builds confidence
3. **Competition**: Users motivated to grow their downline
4. **Community**: Strengthens referral relationships
5. **Analytics**: Better understanding of network structure

---

## 📈 Future Enhancements

### Phase 1 (Current)
- ✅ Show direct upline (1 level up)
- ✅ Show direct downline (1 level down)
- ✅ Display basic stats (referrals, RZC, status)

### Phase 2 (Planned)
- [ ] Multi-level downline view (2-3 levels deep)
- [ ] Genealogy tree visualization
- [ ] Downline earnings breakdown
- [ ] Team performance metrics
- [ ] Export network data

### Phase 3 (Future)
- [ ] Interactive network graph
- [ ] Team chat/messaging
- [ ] Downline leaderboard
- [ ] Team challenges and competitions
- [ ] Network analytics dashboard

---

## 🧪 Testing

### Test Upline Display

```bash
1. User A creates wallet (no referral code)
   → Upline section should be hidden

2. User B creates wallet with User A's code
   → User B should see User A in upline section
   → Should show User A's name, avatar, address

3. Check upline data accuracy
   → Name matches User A's profile
   → Address is correctly truncated
   → Avatar displays correctly
```

### Test Downline Display

```bash
1. User A with no referrals
   → Should show empty state
   → "No downline yet" message

2. User A refers User B
   → User A's downline should show User B
   → Should display join time, status, RZC balance

3. User B refers User C
   → User A's downline should still show only User B
   → User B's downline should show User C

4. Check downline stats
   → Active/Inactive status correct
   → RZC balance matches database
   → Referral count accurate
```

### Database Queries

```sql
-- Check upline relationship
SELECT 
  u.name as user_name,
  upline.name as upline_name
FROM wallet_users u
JOIN wallet_referrals r ON u.id = r.user_id
JOIN wallet_users upline ON r.referrer_id = upline.id
WHERE u.wallet_address = 'USER_ADDRESS';

-- Check downline list
SELECT 
  u.name,
  u.is_active,
  u.rzc_balance,
  r.total_referrals,
  u.created_at
FROM wallet_referrals r
JOIN wallet_users u ON r.user_id = u.id
WHERE r.referrer_id = 'REFERRER_USER_ID'
ORDER BY u.created_at DESC;
```

---

## 📝 Summary

The upline/downline feature provides complete network visibility:

1. **Upline Section**: Shows who referred you (if applicable)
2. **Downline Section**: Shows everyone you referred
3. **Rich Information**: Displays stats, status, and performance
4. **Clean UI**: Distinct styling for upline vs downline
5. **Real-time Data**: Loads from database on page load

This creates a transparent, engaging referral experience that motivates users to build and monitor their network.

---

**Status:** ✅ Fully Implemented  
**Files Modified:**
- `services/supabaseService.ts` - Added getUpline() and getDownline() methods
- `pages/Referral.tsx` - Added upline/downline UI sections

**Ready for:** Testing & Production

