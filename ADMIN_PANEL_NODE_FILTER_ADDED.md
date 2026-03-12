# Admin Panel - Mining Node Filter Added

## Summary
Enhanced the Admin Panel to display mining node information and added filtering capabilities to show users with or without mining nodes.

## Changes Made

### 1. New Filter Option
- Added "Mining Nodes" dropdown filter with three options:
  - **All Nodes**: Show all users (default)
  - **Has Mining Nodes**: Show only users who have purchased mining nodes
  - **No Mining Nodes**: Show only users who haven't purchased any nodes

### 2. Mining Node Data Loading
- Added `loadNodeCounts()` function that queries the `mining_nodes` table
- Counts how many nodes each user has purchased
- Stores counts in `userNodes` state object (wallet_address → count)
- Automatically loads when users are fetched

### 3. Enhanced Display

#### Desktop Table View:
- Added new "Mining Nodes" column showing:
  - Purple badge with Zap icon + count for users with nodes (e.g., "⚡ 3 Nodes")
  - "No nodes" text for users without nodes
- Reordered columns: User | Wallet | Activation | Status | Mining Nodes | RZC Balance | Joined | Actions

#### Mobile Card View:
- Added mining nodes to stats grid (3 columns):
  - Mining Nodes (with Zap icon if has nodes, "None" if not)
  - RZC Balance
  - Joined date

### 4. Statistics Dashboard
- Changed from 4 to 5 stat cards
- Added new "With Nodes" card showing count of users who have mining nodes
- Purple Zap icon to match mining theme
- All stats update based on current filters

### 5. Technical Implementation
```typescript
// Load node counts from database
const loadNodeCounts = async (users: AdminUser[]) => {
  const { data } = await client
    .from('mining_nodes')
    .select('wallet_address')
    .in('wallet_address', walletAddresses);
  
  // Count nodes per wallet
  const counts: Record<string, number> = {};
  data?.forEach(node => {
    counts[node.wallet_address] = (counts[node.wallet_address] || 0) + 1;
  });
  
  setUserNodes(counts);
};

// Client-side filtering for node filter
const displayedUsers = nodeFilter === 'all' 
  ? users 
  : nodeFilter === 'has_nodes'
  ? users.filter(u => (userNodes[u.wallet_address] || 0) > 0)
  : users.filter(u => (userNodes[u.wallet_address] || 0) === 0);
```

## Features

### Admin Capabilities:
1. **View Mining Node Status**: Instantly see which users have purchased nodes
2. **Filter by Node Ownership**: Quickly find users with or without nodes
3. **Track Node Counts**: See exactly how many nodes each user owns
4. **Combined Filtering**: Use node filter with activation/status filters
5. **Statistics Overview**: Dashboard shows total users with nodes

### Use Cases:
- Identify users who activated but haven't purchased nodes (potential upsell)
- Find power users with multiple nodes
- Track node adoption rate
- Support users with node-related issues
- Analyze user engagement with mining features

## Database Schema
Uses existing `mining_nodes` table:
```sql
CREATE TABLE mining_nodes (
  id UUID PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  tier TEXT NOT NULL,
  status TEXT NOT NULL,
  -- ... other fields
);
```

## UI/UX Improvements
- Clear visual distinction between users with/without nodes
- Purple theme for mining-related elements (matches mining nodes page)
- Responsive design maintained for mobile and desktop
- Consistent with existing admin panel design language

## Performance
- Node counts loaded once per page load
- Efficient batch query using `IN` clause
- Client-side filtering for instant response
- No additional database queries when filtering

## Future Enhancements
- Show node tier breakdown (Standard/Premium/VIP)
- Display total mining rewards per user
- Add node status indicators (active/inactive)
- Export node ownership data
- Filter by specific node tiers

---

**Status**: ✅ Complete and tested
**Files Modified**: `pages/AdminPanel.tsx`
**Database Tables Used**: `mining_nodes`, `wallet_users`
