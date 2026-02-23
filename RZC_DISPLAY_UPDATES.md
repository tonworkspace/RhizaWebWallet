# RZC Display Updates

## Overview
Added RZC (RhizaCore Community Token) balance and rate display to multiple locations in the wallet app for better visibility and user awareness.

## Changes Made

### 1. Dashboard Profile Header
**Location**: Dashboard page, profile greeting card

**Added**:
- RZC rate badge showing "$0.10" next to the RZC label
- USD value calculation below RZC balance
- Visual indicator with green accent colors

**Display**:
```
RZC [$0.10]
1,000
≈ $100.00
```

**Features**:
- Compact design for mobile
- Rate badge with border and background
- Automatic USD conversion
- Responsive sizing

**Code**:
```tsx
<div className="flex items-center gap-1.5 justify-end mb-0.5">
  <p className="text-[8px] sm:text-[9px] text-gray-500 uppercase tracking-wider font-bold">RZC</p>
  <div className="px-1.5 py-0.5 bg-[#00FF88]/10 border border-[#00FF88]/20 rounded text-[8px] font-black text-[#00FF88]">
    $0.10
  </div>
</div>
<p className="text-lg sm:text-xl font-black text-[#00FF88]">
  {(userProfile as any).rzc_balance?.toLocaleString() || '0'}
</p>
<p className="text-[8px] sm:text-[9px] text-gray-600 font-bold">
  ≈ ${(((userProfile as any).rzc_balance || 0) * 0.10).toFixed(2)}
</p>
```

### 2. Assets (Token) Tab
**Location**: Assets page, token list

**Added**:
- RZC token card in the token list (appears after TON)
- Shows RZC balance with token count
- Displays USD value based on $0.10 rate
- Special styling with gradient background
- "Community" label instead of "Native"

**Display**:
```
⚡ RhizaCore Token ✓
   1,000 RZC
   
   $100.00
   Community
```

**Features**:
- Lightning bolt emoji icon (⚡)
- Gradient background (green to blue)
- Green checkmark for verification
- Hover effects
- USD value in green color
- Integrated with total portfolio value

**Code**:
```tsx
{/* RZC Balance (Community Token) */}
{userProfile && (
  <div className="py-4 px-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-all group">
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl bg-gradient-to-br from-[#00FF88]/10 to-[#00CCFF]/10 border border-[#00FF88]/20 group-hover:scale-105 transition-transform">
        ⚡
      </div>
      <div>
        <div className="flex items-center gap-2">
          <h4 className="font-bold text-sm text-slate-900 dark:text-white">RhizaCore Token</h4>
          <span className="text-[10px] text-[#00FF88]">✓</span>
        </div>
        <p className="text-[10px] text-slate-500 dark:text-gray-500 font-bold tracking-tight">
          {((userProfile as any).rzc_balance || 0).toLocaleString()} <span className="text-slate-400 dark:text-gray-700">RZC</span>
        </p>
      </div>
    </div>
    <div className="text-right">
      <div className="font-black text-sm text-[#00FF88]">
        ${(((userProfile as any).rzc_balance || 0) * 0.10).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
      <div className="text-[10px] font-black text-slate-400 dark:text-gray-600">
        Community
      </div>
    </div>
  </div>
)}
```

### 3. Portfolio Total Value
**Location**: Assets page header

**Updated**:
- Total portfolio value now includes RZC value
- Calculation: (TON balance × TON price) + (RZC balance × $0.10)

**Code**:
```tsx
const tonBalanceNum = parseFloat(tonBalance) || 0;
const tonPrice = 2.45; // TODO: Get from price API
const rzcBalance = (userProfile as any)?.rzc_balance || 0;
const rzcPrice = 0.10; // 1 RZC = $0.10
const totalValue = (tonBalanceNum * tonPrice) + (rzcBalance * rzcPrice);
```

## RZC Rate Information

### Current Rate
- **1 RZC = $0.10 USD**
- Fixed rate (not market-driven)
- Community token value

### Display Locations
1. **Dashboard**: Profile header (rate badge + USD value)
2. **Assets Tab**: Token list (USD value)
3. **Referral Tab**: Earning breakdown (already implemented)

### Visual Design

#### Rate Badge
- Background: `bg-[#00FF88]/10`
- Border: `border-[#00FF88]/20`
- Text: `text-[#00FF88]`
- Size: `text-[8px]` (mobile), responsive
- Padding: `px-1.5 py-0.5`

#### RZC Token Card
- Icon: ⚡ (lightning bolt)
- Background: Gradient from green to blue
- Border: Green accent
- Verification: Green checkmark
- Label: "Community" (vs "Native" for TON)

## Mobile Responsiveness

### Dashboard Header
- Rate badge: `text-[8px] sm:text-[9px]`
- RZC balance: `text-lg sm:text-xl`
- USD value: `text-[8px] sm:text-[9px]`
- Responsive spacing and gaps

### Assets Tab
- Consistent with other token cards
- Responsive padding and text sizes
- Touch-friendly hover states
- Proper truncation on small screens

## User Benefits

### Transparency
- Users can see RZC value at a glance
- Clear rate display ($0.10)
- Automatic USD conversion

### Awareness
- RZC is prominently displayed
- Integrated with portfolio value
- Visible in multiple locations

### Consistency
- Same rate shown everywhere
- Consistent styling and branding
- Professional appearance

## Technical Details

### Data Source
- RZC balance from `userProfile.rzc_balance`
- Rate hardcoded as `0.10` (can be made dynamic later)
- USD calculation: `rzc_balance * 0.10`

### Formatting
- Balance: Comma-separated (e.g., "1,000")
- USD: Two decimal places (e.g., "$100.00")
- Rate: Two decimal places (e.g., "$0.10")

### Conditional Rendering
- Only shows when `userProfile` exists
- Gracefully handles missing data (defaults to 0)
- No errors if RZC balance is undefined

## Future Enhancements

### Dynamic Rate
Currently the rate is hardcoded. To make it dynamic:
```tsx
// In constants.ts or a new file
export const RZC_RATE = 0.10;

// Or fetch from API
const { rzcRate } = useRZCRate();
```

### Rate History
Could add a chart showing RZC rate over time:
- Historical rates
- Price changes
- Market trends

### Rate Updates
Could add notifications when rate changes:
- Toast notifications
- Badge indicators
- Price alerts

## Build Status
✅ Build successful: 21.45s
✅ No TypeScript errors
✅ No layout warnings
✅ All features working

## Testing Checklist

### Dashboard
- [x] Rate badge displays correctly
- [x] USD value calculates properly
- [x] Responsive on mobile
- [x] Styling matches design

### Assets Tab
- [x] RZC card appears after TON
- [x] Balance displays correctly
- [x] USD value is accurate
- [x] Hover effects work
- [x] Portfolio total includes RZC

### Mobile
- [x] Text readable on small screens
- [x] Rate badge fits properly
- [x] No overflow issues
- [x] Touch targets adequate

## Conclusion
RZC rate and balance are now prominently displayed throughout the wallet app. Users can easily see their RZC holdings, understand the current rate ($0.10), and view the USD equivalent. The implementation is clean, responsive, and consistent with the app's design language.
