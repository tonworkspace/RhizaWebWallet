# Reward Values Calculation (1 RZC = $0.133)

## Price Reference
- **1 RZC = $0.133 USD**

## Calculation Formula
```
RZC Amount = Target USD Value / $0.133
```

---

## Recommended Reward Values

### Signup & Activation

| Reward | Target USD | RZC Amount | Calculation |
|--------|-----------|------------|-------------|
| **Signup Bonus** | $0.60 | **4.5 RZC** | $0.60 / $0.133 = 4.51 |
| **Activation Bonus** | $2.00 | **15 RZC** | $2.00 / $0.133 = 15.04 |

### Referral Bonuses

| Reward | Target USD | RZC Amount | Calculation |
|--------|-----------|------------|-------------|
| **Referral Bonus** | $6.65 | **50 RZC** | $6.65 / $0.133 = 50 |

### Milestone Bonuses

| Milestone | Target USD | RZC Amount | Calculation |
|-----------|-----------|------------|-------------|
| **10 Referrals** | $10.00 | **75 RZC** | $10.00 / $0.133 = 75.19 |
| **50 Referrals** | $16.63 | **125 RZC** | $16.63 / $0.133 = 125 |
| **100 Referrals** | $66.50 | **500 RZC** | $66.50 / $0.133 = 500 |
| **250 Referrals** | $106.40 | **800 RZC** | $106.40 / $0.133 = 800 |
| **500 Referrals** | $199.50 | **1500 RZC** | $199.50 / $0.133 = 1500 |

### Transaction & Login

| Reward | Target USD | RZC Amount | Calculation |
|--------|-----------|------------|-------------|
| **Transaction Bonus** | $0.13 | **1 RZC** | $0.13 / $0.133 = 1 |
| **Daily Login** | $0.13 | **1 RZC** | $0.13 / $0.133 = 1 |

### Squad Mining

| Reward | Target USD | RZC Amount | Calculation |
|--------|-----------|------------|-------------|
| **Base Reward** | $0.13 | **1 RZC** | $0.13 / $0.133 = 1 |

---

## SQL Insert Statement (Corrected)

```sql
INSERT INTO reward_config (key, value, description, category, min_value, max_value, updated_by) VALUES
  -- Signup & Activation (1 RZC = $0.133)
  ('SIGNUP_BONUS', 4.5, 'Welcome bonus on wallet creation (~$0.60)', 'signup', 0, 1000, 'system_init'),
  ('ACTIVATION_BONUS', 15, 'Bonus for wallet activation (~$2.00)', 'activation', 0, 1000, 'system_init'),
  
  -- Referral Bonuses
  ('REFERRAL_BONUS', 50, 'Bonus for each successful referral (~$6.65)', 'referral', 0, 1000, 'system_init'),
  
  -- Milestone Bonuses
  ('REFERRAL_MILESTONE_10', 75, 'Bonus at 10 referrals (~$10.00)', 'milestone', 0, 5000, 'system_init'),
  ('REFERRAL_MILESTONE_50', 125, 'Bonus at 50 referrals (~$16.63)', 'milestone', 0, 10000, 'system_init'),
  ('REFERRAL_MILESTONE_100', 500, 'Bonus at 100 referrals (~$66.50)', 'milestone', 0, 50000, 'system_init'),
  ('REFERRAL_MILESTONE_250', 800, 'Bonus at 250 referrals (~$106.40)', 'milestone', 0, 100000, 'system_init'),
  ('REFERRAL_MILESTONE_500', 1500, 'Bonus at 500 referrals (~$199.50)', 'milestone', 0, 100000, 'system_init'),
  
  -- Transaction & Login
  ('TRANSACTION_BONUS', 1, 'Small bonus per transaction (~$0.13)', 'transaction', 0, 100, 'system_init'),
  ('DAILY_LOGIN', 1, 'Daily login bonus (~$0.13)', 'login', 0, 100, 'system_init'),
  
  -- Commission Percentages
  ('PACKAGE_COMMISSION_PERCENT', 10, 'Commission percentage for package purchases (in RZC)', 'commission', 0, 50, 'system_init'),
  ('TON_COMMISSION_PERCENT', 10, 'Commission percentage for TON payments', 'commission', 0, 50, 'system_init'),
  
  -- Squad Mining
  ('SQUAD_MINING_BASE_REWARD', 1, 'Base reward per squad member for mining (~$0.13)', 'general', 0, 1000, 'system_init'),
  ('SQUAD_MINING_COOLDOWN_HOURS', 8, 'Hours between squad mining claims', 'general', 1, 168, 'system_init')
  
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  min_value = EXCLUDED.min_value,
  max_value = EXCLUDED.max_value;
```

---

## Summary of Changes

### Changed Values:
1. **SIGNUP_BONUS**: 50 → **4.5 RZC** (to match $0.60 target)
2. **REFERRAL_MILESTONE_10**: 25 → **75 RZC** (to match $10 target)
3. **REFERRAL_MILESTONE_250**: 1500 → **800 RZC** (to match $106.40 target)
4. **REFERRAL_MILESTONE_500**: 5000 → **1500 RZC** (to match $199.50 target)
5. **SQUAD_MINING_BASE_REWARD**: 10 → **1 RZC** (to match $0.13 target)

### Unchanged Values:
- ACTIVATION_BONUS: 15 RZC (~$2.00) ✓
- REFERRAL_BONUS: 50 RZC (~$6.65) ✓
- REFERRAL_MILESTONE_50: 125 RZC (~$16.63) ✓
- REFERRAL_MILESTONE_100: 500 RZC (~$66.50) ✓
- TRANSACTION_BONUS: 1 RZC (~$0.13) ✓
- DAILY_LOGIN: 1 RZC (~$0.13) ✓

---

## Update Fallback Values in Code

Also update the fallback values in `services/rewardConfigService.ts`:

```typescript
private getFallbackAmount(key: string): number {
  const fallbacks: Record<string, number> = {
    // Signup & Activation
    'SIGNUP_BONUS': 4.5,        // ~$0.60
    'ACTIVATION_BONUS': 15,     // ~$2.00
    
    // Referral
    'REFERRAL_BONUS': 50,       // ~$6.65
    
    // Milestones
    'REFERRAL_MILESTONE_10': 75,    // ~$10.00
    'REFERRAL_MILESTONE_50': 125,   // ~$16.63
    'REFERRAL_MILESTONE_100': 500,  // ~$66.50
    'REFERRAL_MILESTONE_250': 800,  // ~$106.40
    'REFERRAL_MILESTONE_500': 1500, // ~$199.50
    
    // Transaction & Login
    'TRANSACTION_BONUS': 1,     // ~$0.13
    'DAILY_LOGIN': 1,           // ~$0.13
    
    // Commission
    'PACKAGE_COMMISSION_PERCENT': 10,
    'TON_COMMISSION_PERCENT': 10,
    
    // Squad Mining
    'SQUAD_MINING_BASE_REWARD': 1,  // ~$0.13
    'SQUAD_MINING_COOLDOWN_HOURS': 8,
  };

  const fallbackValue = fallbacks[key] || 0;
  console.log(`🔄 Using fallback for ${key}: ${fallbackValue}`);
  return fallbackValue;
}
```

---

## Quick Reference Table

| Reward Type | RZC Amount | USD Value |
|-------------|------------|-----------|
| Signup | 4.5 | $0.60 |
| Activation | 15 | $2.00 |
| Referral | 50 | $6.65 |
| 10 Refs Milestone | 75 | $10.00 |
| 50 Refs Milestone | 125 | $16.63 |
| 100 Refs Milestone | 500 | $66.50 |
| 250 Refs Milestone | 800 | $106.40 |
| 500 Refs Milestone | 1500 | $199.50 |
| Transaction | 1 | $0.13 |
| Daily Login | 1 | $0.13 |
| Squad Mining | 1 | $0.13 |

---

## Notes

1. **Signup Bonus**: Reduced from 50 to 4.5 RZC to match your $0.60 target
2. **Milestone 10**: Increased from 25 to 75 RZC for better incentive
3. **Milestone 250 & 500**: Adjusted to be more reasonable and sustainable
4. **Squad Mining**: Reduced from 10 to 1 RZC to prevent abuse

These values provide a good balance between:
- Attractive rewards for users
- Sustainable economics for the platform
- Clear progression through milestones
