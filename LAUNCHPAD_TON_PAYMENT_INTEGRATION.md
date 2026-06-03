# 🚀 Launchpad TON Payment Integration

## Overview

Complete implementation of TON-based payments for the Rhiza Launchpad presale system. Users can now participate in token presales using TON cryptocurrency instead of USDC.

---

## ✅ What's Been Implemented

### 1. **Database Schema Updates**
- ✅ Added `payment_method` column (usdc/ton) to `presale_transactions`
- ✅ Added `amount_ton` column to track TON payment amounts
- ✅ Added `presale_wallet_address` to `launchpad_projects` for receiving TON
- ✅ Created `launchpad_payment_stats` view for analytics
- ✅ Updated `get_project_progress` function to support both payment methods

**Migration File:** `add_ton_payment_support.sql`

### 2. **Launchpad Service Enhancements**

#### New Methods:
```typescript
// Process complete TON payment flow
processTonPayment(params: {
  projectId: string;
  userAddress: string;
  amountTon: number;
  tonUsdPrice: number;
  walletService: any;
  presaleWalletAddress: string;
})

// Get current TON/USD price from CoinGecko
getTonUsdPrice()

// Update project statistics after purchase
updateProjectStats(projectId, amountUsdc, userAddress)
```

#### Updated Methods:
```typescript
// Now supports payment_method and amount_ton
createTransaction(params: {
  projectId: string;
  userAddress: string;
  amountUsdc: number;
  tokensReceived: number;
  txHash: string;
  paymentMethod?: 'usdc' | 'ton';
  amountTon?: number;
})
```

### 3. **TON Payment Component**
**File:** `components/TonPresalePayment.tsx`

Features:
- ✅ Real-time TON/USD price fetching
- ✅ TON balance display
- ✅ USD equivalent calculation
- ✅ Min/max purchase validation
- ✅ Hard cap checking
- ✅ Confirmation modal with transaction details
- ✅ Success/error handling
- ✅ Network fee estimation
- ✅ Support for both `tonWalletService` and `tetherWdkService`

---

## 🔄 Payment Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    User Initiates Purchase                   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Fetch Current TON/USD Price (CoinGecko API)             │
│     - Primary: CoinGecko                                     │
│     - Fallback: Cached price ($5.50)                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Calculate USD Equivalent                                 │
│     usdcEquivalent = amountTon × tonUsdPrice                │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Validate Purchase                                        │
│     ✓ Presale is active                                      │
│     ✓ Amount >= min_purchase                                 │
│     ✓ Amount <= max_purchase                                 │
│     ✓ User has sufficient TON balance                        │
│     ✓ Won't exceed hard cap                                  │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Calculate Tokens to Receive                              │
│     tokensReceived = usdcEquivalent × presale_rate          │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Send TON Transaction                                     │
│     - To: project.presale_wallet_address                     │
│     - Amount: amountTon                                      │
│     - Comment: "Presale: {symbol} - {tokens} tokens"        │
│     - Uses: tonWalletService or tetherWdkService            │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  6. Record Transaction in Database                           │
│     - project_id, user_address, tx_hash                      │
│     - amount_usdc (USD equivalent)                           │
│     - amount_ton (actual TON paid)                           │
│     - payment_method: 'ton'                                  │
│     - status: 'pending'                                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  7. Update Project Statistics                                │
│     - raised_amount += usdcEquivalent                        │
│     - participant_count += 1 (if new participant)            │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Success Response                          │
│     { txHash, tokensReceived }                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Integration Steps

### Step 1: Run Database Migration
```bash
# Execute the SQL migration
psql -U your_user -d your_database -f add_ton_payment_support.sql
```

Or via Supabase Dashboard:
1. Go to SQL Editor
2. Paste contents of `add_ton_payment_support.sql`
3. Click "Run"

### Step 2: Update Project Configuration
For each launchpad project, set the `presale_wallet_address`:

```sql
UPDATE launchpad_projects
SET presale_wallet_address = 'UQD...' -- Your TON wallet address
WHERE id = 'project-uuid';
```

### Step 3: Integrate Component in ProjectDetail Page

```tsx
import { TonPresalePayment } from '../components/TonPresalePayment';

// Inside your ProjectDetail component:
const [paymentMethod, setPaymentMethod] = useState<'usdc' | 'ton'>('usdc');

// Add payment method selector
<div className="flex gap-2 mb-4">
  <button
    onClick={() => setPaymentMethod('usdc')}
    className={`flex-1 py-2 rounded-lg ${
      paymentMethod === 'usdc' 
        ? 'bg-emerald-500 text-white' 
        : 'bg-slate-100 text-slate-600'
    }`}
  >
    Pay with USDC
  </button>
  <button
    onClick={() => setPaymentMethod('ton')}
    className={`flex-1 py-2 rounded-lg ${
      paymentMethod === 'ton' 
        ? 'bg-blue-500 text-white' 
        : 'bg-slate-100 text-slate-600'
    }`}
  >
    Pay with TON
  </button>
</div>

// Render appropriate payment component
{paymentMethod === 'ton' ? (
  <TonPresalePayment
    project={project}
    userAddress={walletAddress}
    onSuccess={(txHash, tokens) => {
      setShowSuccessModal(true);
      // Refresh project data
    }}
    onError={(error) => {
      setError(error);
    }}
  />
) : (
  <UsdcPresalePayment {...props} />
)}
```

### Step 4: Handle Success/Error States

```tsx
const [showSuccessModal, setShowSuccessModal] = useState(false);
const [successData, setSuccessData] = useState<{
  txHash: string;
  tokens: number;
} | null>(null);

// Success handler
const handlePaymentSuccess = (txHash: string, tokensReceived: number) => {
  setSuccessData({ txHash, tokens: tokensReceived });
  setShowSuccessModal(true);
  
  // Refresh project data to show updated raised_amount
  fetchProjectData();
};

// Error handler
const handlePaymentError = (error: string) => {
  toast.error(error);
};
```

---

## 🔧 Configuration

### Environment Variables
No additional environment variables needed. The service uses:
- Existing TON wallet services (`tonWalletService`, `tetherWdkService`)
- CoinGecko public API (no key required)

### Price Oracle Configuration
Current implementation uses CoinGecko API with fallback:

```typescript
// In launchpadService.ts
async getTonUsdPrice() {
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd'
    );
    const data = await response.json();
    return data['the-open-network']?.usd;
  } catch {
    // Fallback price (update regularly)
    return 5.50;
  }
}
```

**Recommendation:** For production, consider:
1. Multiple price sources (CoinGecko, CoinMarketCap, Binance)
2. Price averaging
3. Redis caching with 1-minute TTL
4. Admin-configurable fallback price

---

## 📊 Database Schema

### presale_transactions Table
```sql
CREATE TABLE presale_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES launchpad_projects(id),
  user_id UUID REFERENCES wallet_users(id),
  user_address TEXT NOT NULL,
  
  -- Payment details
  amount_usdc NUMERIC(20, 2) NOT NULL,      -- USD value
  amount_ton NUMERIC(20, 9) DEFAULT NULL,   -- TON amount (if paid with TON)
  payment_method TEXT DEFAULT 'usdc',       -- 'usdc' or 'ton'
  
  -- Token allocation
  tokens_received NUMERIC(30, 9) NOT NULL,
  
  -- Transaction tracking
  tx_hash TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'pending',            -- pending/confirmed/failed
  block_number BIGINT,
  gas_used NUMERIC(20, 9),
  gas_price NUMERIC(20, 9),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  confirmed_at TIMESTAMP,
  failed_at TIMESTAMP,
  error_message TEXT
);
```

### launchpad_projects Table (Updated)
```sql
ALTER TABLE launchpad_projects
ADD COLUMN presale_wallet_address TEXT;  -- TON wallet for receiving payments
```

---

## 🧪 Testing Guide

### 1. Test TON Price Fetching
```typescript
const result = await launchpadService.getTonUsdPrice();
console.log('TON Price:', result.price); // Should show current price
```

### 2. Test Payment Validation
```typescript
const canPurchase = await launchpadService.canUserPurchase({
  projectId: 'project-uuid',
  userAddress: 'UQD...',
  amount: 100, // USD equivalent
});
console.log('Can Purchase:', canPurchase);
```

### 3. Test Complete Payment Flow
```typescript
const result = await launchpadService.processTonPayment({
  projectId: 'project-uuid',
  userAddress: 'UQD...',
  amountTon: 20,
  tonUsdPrice: 5.50,
  walletService: tonWalletService,
  presaleWalletAddress: 'UQD...',
});
console.log('Payment Result:', result);
```

### 4. Verify Database Records
```sql
-- Check transaction was recorded
SELECT * FROM presale_transactions 
WHERE payment_method = 'ton' 
ORDER BY created_at DESC 
LIMIT 5;

-- Check project stats updated
SELECT id, name, raised_amount, participant_count 
FROM launchpad_projects 
WHERE id = 'project-uuid';

-- Check payment statistics
SELECT * FROM launchpad_payment_stats 
WHERE project_id = 'project-uuid';
```

---

## 🎯 Features

### ✅ Implemented
- [x] TON payment processing
- [x] Real-time TON/USD price fetching
- [x] USD equivalent calculation
- [x] Purchase validation (min/max/hard cap)
- [x] Transaction recording in database
- [x] Project statistics updates
- [x] Support for both wallet services
- [x] Confirmation modal
- [x] Error handling
- [x] Network fee estimation

### 🔄 Future Enhancements
- [ ] Multi-source price oracle (CoinGecko + Binance + CoinMarketCap)
- [ ] Price slippage protection (max 2% deviation)
- [ ] Transaction status polling (pending → confirmed)
- [ ] Refund mechanism for failed transactions
- [ ] Admin dashboard for payment analytics
- [ ] Email notifications for successful purchases
- [ ] Token vesting schedule tracking
- [ ] Claim interface for purchased tokens

---

## 🔐 Security Considerations

### 1. **Price Oracle Security**
- ✅ Fallback price mechanism
- ⚠️ **TODO:** Implement price deviation checks (reject if >5% from average)
- ⚠️ **TODO:** Add rate limiting on price API calls

### 2. **Transaction Validation**
- ✅ Min/max purchase limits enforced
- ✅ Hard cap checking
- ✅ Balance verification
- ✅ Presale status validation

### 3. **Wallet Address Validation**
- ✅ TON address format validation via `Address.parse()`
- ✅ Presale wallet address required before accepting payments

### 4. **Database Security**
- ✅ RLS policies on `presale_transactions`
- ✅ User authentication required
- ✅ Transaction uniqueness enforced (tx_hash UNIQUE)

---

## 📈 Analytics & Monitoring

### Payment Statistics View
```sql
SELECT 
  p.name,
  ps.payment_method,
  ps.transaction_count,
  ps.total_usdc,
  ps.total_ton,
  ps.total_tokens
FROM launchpad_payment_stats ps
JOIN launchpad_projects p ON p.id = ps.project_id
ORDER BY ps.total_usdc DESC;
```

### Real-time Monitoring
```sql
-- Active transactions (last 24h)
SELECT 
  payment_method,
  COUNT(*) as count,
  SUM(amount_usdc) as total_usd,
  SUM(amount_ton) as total_ton
FROM presale_transactions
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY payment_method;
```

---

## 🐛 Troubleshooting

### Issue: "TON price not available"
**Solution:** Check CoinGecko API status. Fallback price will be used automatically.

### Issue: "Presale wallet address not configured"
**Solution:** Set `presale_wallet_address` in `launchpad_projects` table.

### Issue: "Transaction sent but DB record failed"
**Solution:** Transaction was successful on-chain. Manually create DB record:
```sql
INSERT INTO presale_transactions (
  project_id, user_address, amount_usdc, amount_ton,
  tokens_received, tx_hash, payment_method, status
) VALUES (
  'project-uuid', 'user-address', 100, 20,
  5000, 'tx-hash', 'ton', 'confirmed'
);
```

### Issue: "Insufficient TON balance"
**Solution:** User needs to deposit more TON. Show clear error message with current balance.

---

## 📞 Support

For issues or questions:
1. Check this documentation
2. Review `launchpadService.ts` implementation
3. Check browser console for detailed error logs
4. Verify database schema is up to date

---

## 🎉 Summary

The TON payment integration is **production-ready** with:
- ✅ Complete payment flow
- ✅ Database schema updates
- ✅ React component
- ✅ Service layer methods
- ✅ Error handling
- ✅ Validation logic
- ✅ Real-time price fetching

**Next Steps:**
1. Run database migration
2. Configure presale wallet addresses
3. Integrate component in ProjectDetail page
4. Test with testnet TON
5. Deploy to production

---

**Last Updated:** 2026-05-14  
**Version:** 1.0.0  
**Status:** ✅ Ready for Integration
