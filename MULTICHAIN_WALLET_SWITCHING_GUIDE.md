# Multi-Chain Wallet Switching Guide

**Date:** March 25, 2026  
**Status:** ✅ COMPLETE

---

## 🎯 Overview

Users can now easily switch between different blockchain networks when using the multi-chain wallet (WDK). The wallet supports **3 blockchains** with a single 12-word seed phrase:

1. **EVM (Polygon)** - Ethereum-compatible chain
2. **TON** - The Open Network
3. **BTC** - Bitcoin

---

## 🔧 What Was Implemented

### 1. Chain Selector Component (`components/ChainSelector.tsx`)

A reusable component for switching between chains with two display modes:

**Compact Mode:**
- Dropdown selector with current chain icon
- Perfect for headers/toolbars
- Shows balance for each chain

**Full Mode:**
- Grid layout with detailed chain cards
- Balance display for each chain
- Visual indicators for selected chain
- Disabled state for unavailable chains

**Features:**
- ✅ Visual chain indicators (icons, colors)
- ✅ Real-time balance display
- ✅ Selected chain highlighting
- ✅ Availability checking (requires multi-chain wallet)
- ✅ Responsive design (mobile + desktop)

---

### 2. Multi-Chain Management Page (`pages/MultiChain.tsx`)

A dedicated page for managing multi-chain wallets:

**Features:**
- ✅ Chain selector with balance display
- ✅ Address display for each chain
- ✅ Copy address to clipboard
- ✅ View on blockchain explorer
- ✅ Quick send actions
- ✅ Real-time balance refresh
- ✅ Activation requirement check
- ✅ Wallet creation prompt (if no multi-chain wallet)

**Chain Information Displayed:**
- Chain name and icon
- Current balance
- Wallet address
- Explorer link
- Network status

---

### 3. Navigation Updates (`components/Layout.tsx`)

**Sidebar Navigation:**
- ✅ Enabled "Multi-Chain" menu item
- ✅ Requires activation (lock icon shown if not activated)
- ✅ Located between "Migrate" and "History"

**Network Switcher Enhanced:**
- ✅ Renamed to "TON Network" section
- ✅ Added "WDK Networks" section showing all 3 chains
- ✅ Visual indicators for each blockchain:
  - 🟣 EVM (Polygon)
  - 🔵 TON
  - 🟠 BTC (Bitcoin)
- ✅ Informative note about multi-chain support

---

### 4. Routing Updates (`App.tsx`)

**New Route:**
```typescript
<Route path="/wallet/multi-chain" element={<ProtectedRoute><MultiChain /></ProtectedRoute>} />
```

**Existing Routes:**
- `/wallet/secondary` - Still uses SecondaryWallet component
- `/wallet/transfer` - Already supports chain switching via state

---

## 🎨 User Experience

### How Users Switch Chains

**Method 1: Multi-Chain Page**
1. Navigate to "Multi-Chain" from sidebar
2. See all available chains in grid layout
3. Click on desired chain card
4. View balance, address, and actions for that chain
5. Click "Send" to transfer funds on that chain

**Method 2: Transfer Page**
1. Navigate to "Transfer"
2. Click asset selector at top
3. Choose from:
   - TON Vault (24-word wallet)
   - RZC Token
   - ETH (Multi-Chain)
   - BTC (Multi-Chain)
   - TON (Multi-Chain)
4. Transfer page automatically adjusts for selected chain

**Method 3: Assets Page**
1. Navigate to "Assets"
2. Click on EVM or BTC asset
3. Automatically navigates to Transfer page with chain pre-selected

---

## 🔐 Security Features

**Activation Required:**
- Multi-chain features require wallet activation
- Lock icon shown on menu items
- Activation modal appears when clicking locked features

**Wallet Availability:**
- Checks if multi-chain wallet exists
- Shows creation prompt if not available
- Prevents errors from missing wallet

**Address Validation:**
- Each chain has specific address format
- Validation happens before transactions
- Clear error messages for invalid addresses

---

## 📱 Responsive Design

**Desktop:**
- Full grid layout for chain selector
- Detailed chain cards with all information
- Sidebar navigation always visible

**Mobile:**
- Compact dropdown for chain selector
- Bottom navigation bar
- Touch-optimized buttons
- Responsive grid (1 column on mobile, 2 on tablet)

---

## 🎯 Chain-Specific Features

### EVM (Polygon)
- **Symbol:** ETH
- **Icon:** ⟠
- **Address Format:** 0x... (40 hex characters)
- **Explorer:** polygonscan.com
- **Gas:** ~0.002 ETH buffer for transactions

### TON (WDK)
- **Symbol:** TON
- **Icon:** 💠
- **Address Format:** EQ... or UQ...
- **Explorer:** tonviewer.com
- **Gas:** ~0.05 TON buffer for transactions

### Bitcoin
- **Symbol:** BTC
- **Icon:** ₿
- **Address Format:** bc1..., 1..., or 3...
- **Explorer:** blockstream.info
- **Gas:** Dynamic fee calculation via WDK

---

## 🔄 Network Switching

**Current Behavior:**
- Network switcher in header controls TON network (mainnet/testnet)
- WDK automatically switches all 3 chains when TON network changes
- All chains follow the same network setting

**Network Options:**
- **Mainnet** - Production networks (real funds)
- **Testnet** - Test networks (test funds)

**Visual Indicators:**
- Green pulsing dot for mainnet
- Amber pulsing dot for testnet
- Network name clearly labeled

---

## 📊 Balance Display

**Real-Time Updates:**
- Balances fetched from WDK service
- Refresh button available on Multi-Chain page
- Auto-refresh on page load

**Balance Precision:**
- EVM: 6 decimal places
- TON: 4 decimal places
- BTC: 8 decimal places

**Balance Sources:**
- EVM: Polygon RPC
- TON: TonCenter API
- BTC: Electrum WebSocket

---

## 🚀 Quick Actions

**From Multi-Chain Page:**
1. **Send** - Navigate to Transfer page with chain pre-selected
2. **View Assets** - Navigate to Assets page
3. **Copy Address** - Copy wallet address to clipboard
4. **View Explorer** - Open blockchain explorer in new tab
5. **Refresh** - Reload balances and addresses

**From Transfer Page:**
1. **Asset Selector** - Switch between chains
2. **Max Button** - Calculate max sendable amount (minus fees)
3. **Send All** - Send entire balance (minus fees)
4. **Fee Estimation** - Real-time fee quotes from WDK

---

## 💡 User Education

**Info Cards:**
- Explanation of multi-chain wallet concept
- Benefits of single seed phrase
- Network synchronization behavior
- WDK technology information

**Visual Cues:**
- Color-coded chains (purple, blue, orange)
- Icons for each blockchain
- Status indicators (available, locked, selected)
- Balance display with proper decimals

---

## 🔧 Technical Implementation

**Components:**
```
components/
  ├── ChainSelector.tsx      # Reusable chain switcher
  └── Layout.tsx             # Updated navigation

pages/
  └── MultiChain.tsx         # Multi-chain management page

services/
  └── tetherWdkService.ts    # WDK integration (existing)
```

**State Management:**
- `selectedChain` state tracks current chain
- `multiChainBalances` stores balances for all chains
- `multiChainAddresses` stores addresses for all chains
- WalletManager checks for multi-chain wallet availability

**Data Flow:**
1. Check if multi-chain wallet exists
2. Fetch addresses from WDK
3. Fetch balances from WDK
4. Display in UI with chain selector
5. User selects chain
6. UI updates to show selected chain details
7. Actions (send, view) use selected chain

---

## 📝 Usage Examples

### Example 1: Send ETH on Polygon
```typescript
1. Navigate to Multi-Chain page
2. Select "EVM Chain" card
3. Click "Send ETH" button
4. Enter recipient 0x address
5. Enter amount
6. Confirm transaction
7. Transaction sent on Polygon network
```

### Example 2: View Bitcoin Balance
```typescript
1. Navigate to Multi-Chain page
2. Select "Bitcoin" card
3. View balance in BTC
4. Copy Bitcoin address
5. Share address to receive BTC
```

### Example 3: Switch Networks
```typescript
1. Click profile menu in header
2. Select network dropdown
3. Choose "TON Testnet"
4. All chains switch to testnet
5. Balances update automatically
```

---

## 🎉 Benefits

**For Users:**
- ✅ Single seed phrase for 3 blockchains
- ✅ Easy chain switching
- ✅ Clear visual indicators
- ✅ Real-time balance updates
- ✅ Integrated explorer links
- ✅ Copy address with one click

**For Developers:**
- ✅ Reusable ChainSelector component
- ✅ Clean separation of concerns
- ✅ Type-safe chain selection
- ✅ Consistent UI patterns
- ✅ Easy to extend with more chains

**For Security:**
- ✅ Activation requirement
- ✅ Address validation per chain
- ✅ Fee estimation before sending
- ✅ Clear transaction confirmations
- ✅ Network mismatch prevention

---

## 🔮 Future Enhancements

**Potential Additions:**
1. **More Chains** - Add support for more EVM chains (BSC, Arbitrum, etc.)
2. **Token Support** - Show ERC-20, TRC-20, BEP-20 tokens
3. **Transaction History** - Per-chain transaction history
4. **Price Display** - Show USD value for each balance
5. **Portfolio View** - Combined portfolio across all chains
6. **Custom RPC** - Allow users to add custom RPC endpoints
7. **Hardware Wallet** - Support for Ledger/Trezor
8. **Multi-Sig** - Multi-signature wallet support

---

## 📚 Related Documentation

- `WDK_QUICK_REFERENCE.md` - WDK integration guide
- `WDK_AI_INTEGRATION_GUIDE.md` - AI assistant integration
- `WALLET_SECURITY_AUDIT_REPORT.md` - Security audit
- `services/tetherWdkService.ts` - WDK service implementation

---

## ✅ Testing Checklist

**Chain Selector:**
- [ ] Compact mode displays correctly
- [ ] Full mode displays correctly
- [ ] Chain selection updates state
- [ ] Balances display with correct decimals
- [ ] Unavailable chains show disabled state
- [ ] Selected chain has visual indicator

**Multi-Chain Page:**
- [ ] Loads without multi-chain wallet (shows prompt)
- [ ] Loads with multi-chain wallet (shows chains)
- [ ] Activation check works
- [ ] Refresh button updates balances
- [ ] Copy address works
- [ ] Explorer links open correctly
- [ ] Send button navigates with correct state

**Navigation:**
- [ ] Multi-Chain menu item visible
- [ ] Lock icon shows when not activated
- [ ] Activation modal appears when locked
- [ ] Network switcher shows all chains
- [ ] Network switching updates all chains

**Transfer Page:**
- [ ] Asset selector shows all chains
- [ ] Chain pre-selection from navigation works
- [ ] Fee estimation works per chain
- [ ] Max button calculates correctly per chain
- [ ] Send All works per chain
- [ ] Address validation works per chain

---

## 🎯 Summary

Users can now easily switch between EVM, TON, and Bitcoin networks using:
1. **Multi-Chain page** - Dedicated management interface
2. **Chain Selector** - Reusable component for any page
3. **Transfer page** - Asset selector with chain switching
4. **Network switcher** - Controls all chains simultaneously

All features are protected by activation requirements and include proper error handling, validation, and user feedback.

---

**Implementation Status:** ✅ COMPLETE  
**Last Updated:** March 25, 2026  
**Next Steps:** Test thoroughly and gather user feedback

