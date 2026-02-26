# Squad Mining System - Integration Guide 🎯

## Overview

The Squad Mining system is now fully integrated with your referral system, allowing users to earn RZC rewards every 8 hours based on their squad size (downline).

---

## Features ✨

### Core Functionality
- **8-Hour Claim Cycle**: Users can claim rewards every 8 hours
- **2 RZC per Member**: Regular squad members earn 2 RZC per claim
- **5 RZC per Premium**: Premium members earn 5 RZC per claim
- **Automatic Tracking**: All claims are tracked in the database
- **Real-time Stats**: Live squad size and potential rewards
- **Countdown Timer**: Shows time until next claim

### Integration Points
- Uses existing `wallet_referrals` table for squad data
- Integrates with `supabaseService.getDownline()` for squad members
- Uses `supabaseService.awardRZCTokens()` for reward distribution
- Creates notifications for successful claims
- Tracks all claims in `wallet_squad_claims` table

---

## Database Setup 🗄️

### Step 1: Run the Migration

Execute the SQL migration file to add squad mining support:

```bash
# In Supabase SQL Editor, run:
add_squad_mining_system.sql
```

### What It Creates:

1. **New Columns in `wallet_users`**:
   - `last_squad_claim_at` - Timestamp of last claim
   - `total_squad_rewards` - Total RZC earned from squad mining
   - `is_premium` - Premium member status (earns 5 RZC instead of 2)

2. **New Table `wallet_squad_claims`**:
   - Tracks all squad mining claims
   - Stores squad size, reward amount, premium count
   - Unique transaction IDs prevent duplicates

3. **Database Functions**:
   - `claim_squad_rewards()` - Handles claim logic with 8-hour cooldown
   - `get_squad_mining_stats()` - Returns squad stats efficiently

4. **View `squad_mining_leaderboard`**:
   - Shows top earners from squad mining
   - Includes rank, total earned, squad size

---

## How It Works 🔄

### 1. Squad Size Calculation
```typescript
// Squad size = number of users in downline
const squadSize = await supabaseService.getDownline(userId);
```

### 2. Reward Calculation
```typescript
// For each squad member:
// - Regular member: 2 RZC
// - Premium member: 5 RZC
const reward = members.reduce((total, member) => {
  return total + (member.is_premium ? 5 : 2);
}, 0);
```

### 3. Claim Process
```typescript
// 1. Check if 8 hours have passed
// 2. Calculate total reward
// 3. Award RZC tokens
// 4. Update last_claim_at
// 5. Create notification
// 6. Record in squad_claims table
```

---

## Frontend Integration 🎨

### Referral Page Component

The squad mining card is already integrated in `pages/Referral.tsx`:

```typescript
// Squad Mining State
const [squadStats, setSquadStats] = useState<SquadMiningStats | null>(null);
const [isClaiming, setIsClaiming] = useState(false);
const [timeUntilClaim, setTimeUntilClaim] = useState({
  hours: 0,
  minutes: 0,
  canClaim: boolean
});

// Load squad data
const loadSquadMiningData = async () => {
  const stats = await squadMiningService.getSquadMiningStats(userProfile.id);
  setSquadStats(stats);
};

// Claim rewards
const claimSquadRewards = async () => {
  const transactionId = squadMiningService.generateTransactionId(userProfile.id);
  const result = await squadMiningService.claimSquadRewards(userProfile.id, transactionId);
  
  if (result.success) {
    showToast(`Claimed ${result.reward_amount} RZC!`, 'success');
    await loadSquadMiningData();
  }
};
```

### UI Components

1. **Squad Mining Card**: Shows stats and claim button
2. **Countdown Timer**: Updates every minute
3. **Success/Error Messages**: User feedback
4. **Stats Display**: Squad size, potential reward, total earned

---

## API Methods 📡

### squadMiningService.getSquadMiningStats()

```typescript
const stats = await squadMiningService.getSquadMiningStats(userId);

// Returns:
{
  squad_size: number;           // Number of squad members
  potential_reward: number;     // RZC available to claim
  total_rewards_earned: number; // Total RZC earned all-time
  last_claim_at: string | null; // Last claim timestamp
  can_claim: boolean;           // Can claim now?
  next_claim_at: string | null; // Next claim time
  hours_until_claim: number;    // Hours remaining
}
```

### squadMiningService.claimSquadRewards()

```typescript
const result = await squadMiningService.claimSquadRewards(userId, transactionId);

// Returns:
{
  success: boolean;
  reward_amount?: number;  // RZC claimed
  squad_size?: number;     // Squad size at claim time
  error?: string;          // Error message if failed
}
```

### squadMiningService.getSquadMembers()

```typescript
const members = await squadMiningService.getSquadMembers(userId);

// Returns array of:
{
  id: number;
  username: string;
  wallet_address: string;
  is_active: boolean;
  is_premium: boolean;      // Earns 5 RZC instead of 2
  joined_at: string;
  rank: string;             // 'Elite' or 'Pro'
  total_earned: number;
  avatar?: string;
  total_referrals?: number;
  rzc_balance?: number;
}
```

---

## Testing Guide 🧪

### 1. Test Squad Stats

```javascript
// In browser console:
const stats = await squadMiningService.getSquadMiningStats('your_user_id');
console.log('Squad Stats:', stats);
```

### 2. Test Claim (if eligible)

```javascript
const txId = squadMiningService.generateTransactionId('your_user_id');
const result = await squadMiningService.claimSquadRewards('your_user_id', txId);
console.log('Claim Result:', result);
```

### 3. Check Database

```sql
-- View your squad claims
SELECT * FROM wallet_squad_claims 
WHERE user_id = 'your_user_id' 
ORDER BY claimed_at DESC;

-- View your stats
SELECT 
  last_squad_claim_at,
  total_squad_rewards,
  is_premium
FROM wallet_users 
WHERE id = 'your_user_id';

-- View leaderboard
SELECT * FROM squad_mining_leaderboard LIMIT 10;
```

---

## Premium Members 👑

### How to Make a User Premium

```sql
-- Grant premium status
UPDATE wallet_users 
SET is_premium = true 
WHERE id = 'user_id_here';

-- Remove premium status
UPDATE wallet_users 
SET is_premium = false 
WHERE id = 'user_id_here';
```

### Premium Benefits
- Earn 5 RZC per claim (instead of 2)
- Special "Elite" rank badge
- Highlighted in squad member list

---

## Error Handling 🛡️

### Common Errors

1. **"Must wait X hours before next claim"**
   - User tried to claim before 8 hours passed
   - Show countdown timer

2. **"No squad members to claim from"**
   - User has no downline yet
   - Encourage them to share referral link

3. **"Failed to award RZC"**
   - Database error or insufficient permissions
   - Check Supabase logs

### Fallback Mechanism

The service has built-in fallbacks:
- If database function fails, uses manual calculation
- If one method fails, tries alternative approach
- Always returns valid data structure

---

## Performance Optimization ⚡

### Database Indexes

All necessary indexes are created by the migration:
- `idx_squad_claims_user_id`
- `idx_wallet_users_last_squad_claim`
- `idx_wallet_users_is_premium`

### Caching Strategy

```typescript
// Cache squad stats for 1 minute
const CACHE_DURATION = 60000;
let cachedStats: { data: SquadMiningStats; timestamp: number } | null = null;

const getCachedStats = async (userId: string) => {
  const now = Date.now();
  if (cachedStats && (now - cachedStats.timestamp) < CACHE_DURATION) {
    return cachedStats.data;
  }
  
  const stats = await squadMiningService.getSquadMiningStats(userId);
  cachedStats = { data: stats, timestamp: now };
  return stats;
};
```

---

## Security 🔒

### Row Level Security (RLS)

All tables have RLS enabled:
- Users can only view their own claims
- Users can only insert their own claims
- Admins can view all data

### Duplicate Prevention

- Unique transaction IDs prevent duplicate claims
- 8-hour cooldown enforced at database level
- Database function validates all claims

---

## Monitoring & Analytics 📊

### Key Metrics to Track

```sql
-- Total claims today
SELECT COUNT(*) FROM wallet_squad_claims 
WHERE claimed_at >= CURRENT_DATE;

-- Total RZC distributed
SELECT SUM(reward_amount) FROM wallet_squad_claims;

-- Average squad size
SELECT AVG(squad_size) FROM wallet_squad_claims;

-- Top earners
SELECT * FROM squad_mining_leaderboard LIMIT 10;

-- Premium member count
SELECT COUNT(*) FROM wallet_users WHERE is_premium = true;
```

---

## Troubleshooting 🔧

### Issue: Stats not loading

```typescript
// Check if database function exists
const { data, error } = await supabaseService.client
  .rpc('get_squad_mining_stats', { p_user_id: userId });

if (error) {
  console.error('Function error:', error);
  // Will fallback to manual calculation
}
```

### Issue: Claims failing

```sql
-- Check last claim time
SELECT 
  id,
  last_squad_claim_at,
  EXTRACT(EPOCH FROM (NOW() - last_squad_claim_at)) / 3600 as hours_since_claim
FROM wallet_users 
WHERE id = 'user_id_here';

-- Should be >= 8 hours to claim
```

### Issue: Incorrect reward amount

```sql
-- Check squad composition
SELECT 
  u.id,
  u.name,
  u.is_premium,
  CASE WHEN u.is_premium THEN 5 ELSE 2 END as reward_per_claim
FROM wallet_referrals r
JOIN wallet_users u ON r.user_id = u.id
WHERE r.referrer_id = 'user_id_here';
```

---

## Future Enhancements 🚀

### Potential Features

1. **Squad Levels**: Unlock higher rewards at certain squad sizes
2. **Bonus Multipliers**: Special events with 2x or 3x rewards
3. **Squad Challenges**: Compete with other squads
4. **Auto-Claim**: Optional automatic claiming
5. **Squad Chat**: Communication between squad members
6. **Performance Bonuses**: Extra rewards for active squads

---

## Summary ✅

The Squad Mining system is now:
- ✅ Fully integrated with referral system
- ✅ Database tables and functions created
- ✅ Frontend UI implemented
- ✅ Error handling and fallbacks in place
- ✅ Security and RLS configured
- ✅ Performance optimized with indexes
- ✅ Ready for production use

Users can now earn passive RZC rewards every 8 hours based on their squad size!

---

## Support

For issues or questions:
1. Check Supabase logs for errors
2. Verify database migration ran successfully
3. Test with browser console
4. Check RLS policies if permission errors occur

Happy Squad Mining! 🎉
