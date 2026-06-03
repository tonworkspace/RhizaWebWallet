# RZC Tokenomics — Quick Reference Card

## 🎯 Core Facts

**Total Supply**: 21,000,000 RZC (Fixed Forever)  
**ICO Allocation**: 10,500,000 RZC (50%)  
**Model**: Bitcoin-inspired scarcity  

---

## 💰 ICO Rounds

| Round | Price | Cap | % Supply | Raise |
|-------|-------|-----|----------|-------|
| **Seed** | $0.012 | 3.15M | 15% | $37.8K |
| **Private** | $0.018 | 3.15M | 15% | $56.7K |
| **Pre-Launch** | $0.025 | 2.1M | 10% | $52.5K |
| **Listing** | $1.00 | 2.1M | 10% | $2.1M |

---

## 📊 Token Distribution

```
ICO Sales:        10.5M (50%) ████████████████████████████████████████████████
Team & Advisors:   2.1M (10%) ██████████
Ecosystem:         3.15M (15%) ███████████████
Marketing:         2.1M (10%) ██████████
Liquidity:         1.575M (7.5%) ████████
Treasury:          1.575M (7.5%) ████████
```

---

## 🚀 ROI Potential

**Seed → Listing**: 83.33x  
**$100 → $8,333**  
**$1,000 → $83,333**  
**$10,000 → $833,333**  

---

## 📈 Price Milestones

- **Seed**: $0.012 ← YOU ARE HERE
- **Private**: $0.018 (+50%)
- **Pre-Launch**: $0.025 (+108%)
- **Listing**: $1.00 (+8,233%)
- **Target**: $10.00 (+83,233%)

---

## ⚡ Quick SQL Fix

```sql
-- Run in Supabase SQL Editor
UPDATE sale_rounds SET token_cap = 3150000, price_usd = 0.012 WHERE round_number = 1;
UPDATE sale_rounds SET token_cap = 3150000, price_usd = 0.018 WHERE round_number = 2;
UPDATE sale_rounds SET token_cap = 2100000, price_usd = 0.025 WHERE round_number = 3;
UPDATE sale_rounds SET token_cap = 2100000, price_usd = 1.00 WHERE round_number = 4;
```

---

## ✅ Why This Works

- **Scarcity**: Only 21M ever (like Bitcoin)
- **Fair**: 50% for public, 50% for development
- **Credible**: Realistic caps, no overselling
- **Exchange-Ready**: Meets listing requirements
- **Sustainable**: Long-term value growth

---

## 🎯 Marketing Messages

**"The Bitcoin of Identity Networks"**  
21 million tokens. Fixed supply. Deflationary.

**"83x ROI Potential"**  
Seed investors at $0.012 → Listing at $1.00

**"Only 15% Available Now"**  
3.15M RZC in seed round, then price rises forever.

**"Limited Supply, Unlimited Potential"**  
50% sold to public, 50% locked for development.

---

## 📁 Full Documentation

- `RZC_TOKENOMICS_21M_SUPPLY.md` — Complete breakdown
- `fix_ico_rounds_21m_supply.sql` — Database update script
- `TOKENOMICS_FIX_COMPARISON.md` — Before/after analysis

---

**Status**: ✅ Ready to deploy
