# 🔄 Launchpad Service Flow Diagram

**Purpose:** Visual guide to how the launchpad service works  
**Date:** May 13, 2026

---

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│                    (pages/LaunchpadList.tsx)                    │
│                                                                 │
│  ┌──────────────┐         ┌──────────────┐                    │
│  │   Landing    │  ────▶  │   Catalog    │                    │
│  │     View     │         │     View     │                    │
│  └──────────────┘         └──────────────┘                    │
│         │                        │                             │
│         │                        │                             │
│         ▼                        ▼                             │
│  ┌─────────────────────────────────────┐                      │
│  │      Stats Banner (Real-time)       │                      │
│  │  Live Sales | Investors | Raised    │                      │
│  └─────────────────────────────────────┘                      │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ API Calls
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                       SERVICE LAYER                             │
│                (services/launchpadService.ts)                   │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │ getProjects  │  │   getStats   │  │  getProject  │        │
│  │   (filter)   │  │  (calculate) │  │     (id)     │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │canUserPurchase│ │createTransaction│ │getUserTxns  │        │
│  │  (validate)  │  │   (record)   │  │   (history)  │        │
│  └──────────────┘  └──────────────┘  └──────────────┘        │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ SQL Queries
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE LAYER                             │
│                        (Supabase)                               │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              launchpad_projects (4 rows)                 │  │
│  │  - Abundance Protocol (live)                             │  │
│  │  - DeFi Yield Optimizer (live)                           │  │
│  │  - MetaGaming Token (upcoming)                           │  │
│  │  - GreenEnergy Coin (ended)                              │  │
│  └─────────────────────────────────────────────────────────┘  │
│                            │                                    │
│                            │ Foreign Key                        │
│                            ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │           presale_transactions (0 rows)                  │  │
│  │  - Records user purchases                                │  │
│  │  - Links to wallet_users                                 │  │
│  │  - Triggers stats update on confirm                      │  │
│  └─────────────────────────────────────────────────────────┘  │
│                            │                                    │
│                            │ Trigger                            │
│                            ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              notifications (0 rows)                      │  │
│  │  - Created when transaction confirmed                    │  │
│  │  - Notifies user of purchase                             │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow: Loading Projects

```
User visits /wallet/launchpad-list
         │
         ▼
┌────────────────────┐
│  LaunchpadList.tsx │
│   useEffect()      │
└────────────────────┘
         │
         │ 1. Call service
         ▼
┌────────────────────────────┐
│ launchpadService           │
│   .getProjects()           │
└────────────────────────────┘
         │
         │ 2. Query database
         ▼
┌────────────────────────────┐
│ SELECT * FROM              │
│ launchpad_projects         │
│ ORDER BY status, date      │
└────────────────────────────┘
         │
         │ 3. Return data
         ▼
┌────────────────────────────┐
│ [                          │
│   { id, name, status, ... }│
│   { id, name, status, ... }│
│   { id, name, status, ... }│
│   { id, name, status, ... }│
│ ]                          │
└────────────────────────────┘
         │
         │ 4. Convert to UI format
         ▼
┌────────────────────────────┐
│ convertBackendProject()    │
│ - Calculate progress %     │
│ - Format time remaining    │
│ - Build badges array       │
└────────────────────────────┘
         │
         │ 5. Render UI
         ▼
┌────────────────────────────┐
│ 4 Project Cards Displayed  │
│ - Abundance Protocol       │
│ - DeFi Yield Optimizer     │
│ - MetaGaming Token         │
│ - GreenEnergy Coin         │
└────────────────────────────┘
```

---

## 🔄 Data Flow: Calculating Stats

```
User visits page
         │
         ▼
┌────────────────────┐
│  LaunchpadList.tsx │
│   useEffect()      │
└────────────────────┘
         │
         │ 1. Call service
         ▼
┌────────────────────────────┐
│ launchpadService           │
│   .getStats()              │
└────────────────────────────┘
         │
         │ 2. Query all projects
         ▼
┌────────────────────────────┐
│ SELECT status,             │
│   raised_amount,           │
│   participant_count        │
│ FROM launchpad_projects    │
└────────────────────────────┘
         │
         │ 3. Calculate totals
         ▼
┌────────────────────────────┐
│ total_projects = 4         │
│ live_projects = 2          │
│ total_raised = 226,100     │
│ total_participants = 2,320 │
└────────────────────────────┘
         │
         │ 4. Display in banner
         ▼
┌────────────────────────────┐
│ ┌────┬────────┬─────────┐ │
│ │ 2  │ 2,320  │ $226K   │ │
│ │Live│Investors│ Raised  │ │
│ └────┴────────┴─────────┘ │
└────────────────────────────┘
```

---

## 🔄 Data Flow: Validating Purchase

```
User enters amount: 100 USDC
         │
         ▼
┌────────────────────────────┐
│ canUserPurchase({          │
│   projectId: 'abc',        │
│   userAddress: '0x...',    │
│   amount: 100              │
│ })                         │
└────────────────────────────┘
         │
         │ 1. Get project details
         ▼
┌────────────────────────────┐
│ SELECT * FROM              │
│ launchpad_projects         │
│ WHERE id = 'abc'           │
└────────────────────────────┘
         │
         │ 2. Validate conditions
         ▼
┌────────────────────────────┐
│ ✅ Status = 'live'         │
│ ✅ Now < presale_end       │
│ ✅ raised < hard_cap       │
│ ✅ 100 >= min_purchase(50) │
│ ✅ 100 <= max_purchase(10K)│
│ ✅ raised+100 <= hard_cap  │
└────────────────────────────┘
         │
         │ 3. Return result
         ▼
┌────────────────────────────┐
│ {                          │
│   success: true,           │
│   canPurchase: true        │
│ }                          │
└────────────────────────────┘
         │
         │ 4. Enable buy button
         ▼
┌────────────────────────────┐
│ [  Buy Now  ] ✅           │
└────────────────────────────┘
```

---

## 🔄 Data Flow: Creating Transaction

```
User clicks "Buy Now"
         │
         ▼
┌────────────────────────────┐
│ createTransaction({        │
│   projectId: 'abc',        │
│   userAddress: '0x...',    │
│   amountUsdc: 100,         │
│   tokensReceived: 420,     │
│   txHash: '0x123...'       │
│ })                         │
└────────────────────────────┘
         │
         │ 1. Get user profile
         ▼
┌────────────────────────────┐
│ SELECT id FROM             │
│ wallet_users               │
│ WHERE wallet_address='0x..'│
└────────────────────────────┘
         │
         │ 2. Insert transaction
         ▼
┌────────────────────────────┐
│ INSERT INTO                │
│ presale_transactions       │
│ (project_id, user_id,      │
│  amount_usdc, status, ...) │
│ VALUES (...)               │
└────────────────────────────┘
         │
         │ 3. Return transaction
         ▼
┌────────────────────────────┐
│ {                          │
│   id: 'xyz',               │
│   status: 'pending',       │
│   amount_usdc: 100,        │
│   tokens_received: 420     │
│ }                          │
└────────────────────────────┘
```

---

## 🔄 Data Flow: Transaction Confirmation (Trigger)

```
Backend confirms transaction
         │
         ▼
┌────────────────────────────┐
│ UPDATE presale_transactions│
│ SET status = 'confirmed',  │
│     confirmed_at = NOW()   │
│ WHERE tx_hash = '0x123'    │
└────────────────────────────┘
         │
         │ TRIGGER FIRES
         ▼
┌────────────────────────────┐
│ trigger_update_project_stats│
└────────────────────────────┘
         │
         │ 1. Update project stats
         ▼
┌────────────────────────────┐
│ UPDATE launchpad_projects  │
│ SET                        │
│   raised_amount += 100,    │
│   participant_count += 1   │
│ WHERE id = 'abc'           │
└────────────────────────────┘
         │
         │ 2. Create notification
         ▼
┌────────────────────────────┐
│ INSERT INTO notifications  │
│ (user_id, type, title,     │
│  message, ...)             │
│ VALUES (...)               │
└────────────────────────────┘
         │
         │ 3. Real-time update
         ▼
┌────────────────────────────┐
│ UI auto-refreshes          │
│ - Progress bar updates     │
│ - Stats banner updates     │
│ - User sees notification   │
└────────────────────────────┘
```

---

## 🔄 Data Flow: Real-time Updates

```
Every 30 seconds
         │
         ▼
┌────────────────────────────┐
│ setInterval(() => {        │
│   fetchProjects()          │
│   fetchStats()             │
│ }, 30000)                  │
└────────────────────────────┘
         │
         │ 1. Fetch latest data
         ▼
┌────────────────────────────┐
│ SELECT * FROM              │
│ launchpad_projects         │
└────────────────────────────┘
         │
         │ 2. Update state
         ▼
┌────────────────────────────┐
│ setProjects(newData)       │
│ setStats(newStats)         │
└────────────────────────────┘
         │
         │ 3. React re-renders
         ▼
┌────────────────────────────┐
│ UI updates automatically   │
│ - Progress bars            │
│ - Stats banner             │
│ - Time remaining           │
└────────────────────────────┘
```

---

## 🔄 Data Flow: Search & Filter

```
User types "Abundance"
         │
         ▼
┌────────────────────────────┐
│ setSearchQuery('Abundance')│
└────────────────────────────┘
         │
         │ 1. Filter in memory
         ▼
┌────────────────────────────┐
│ projects.filter(p =>       │
│   p.name.includes('Abundance')│
│   || p.symbol.includes(...) │
│ )                          │
└────────────────────────────┘
         │
         │ 2. Re-render
         ▼
┌────────────────────────────┐
│ Display 1 result:          │
│ - Abundance Protocol       │
└────────────────────────────┘

User clicks "Live" filter
         │
         ▼
┌────────────────────────────┐
│ setFilter('live')          │
└────────────────────────────┘
         │
         │ 1. Filter in memory
         ▼
┌────────────────────────────┐
│ projects.filter(p =>       │
│   p.status === 'live'      │
│ )                          │
└────────────────────────────┘
         │
         │ 2. Re-render
         ▼
┌────────────────────────────┐
│ Display 2 results:         │
│ - Abundance Protocol       │
│ - DeFi Yield Optimizer     │
└────────────────────────────┘
```

---

## 📊 Database Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                     wallet_users                            │
│  ┌────────────────────────────────────────────────────┐    │
│  │ id (UUID)                                          │    │
│  │ wallet_address (TEXT)                              │    │
│  │ ...                                                │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Referenced by
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  presale_transactions                       │
│  ┌────────────────────────────────────────────────────┐    │
│  │ id (UUID)                                          │    │
│  │ user_id (UUID) → wallet_users.id                   │    │
│  │ project_id (UUID) → launchpad_projects.id          │    │
│  │ user_address (TEXT)                                │    │
│  │ amount_usdc (NUMERIC)                              │    │
│  │ tokens_received (NUMERIC)                          │    │
│  │ status (TEXT)                                      │    │
│  │ tx_hash (TEXT)                                     │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ References
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  launchpad_projects                         │
│  ┌────────────────────────────────────────────────────┐    │
│  │ id (UUID)                                          │    │
│  │ name (TEXT)                                        │    │
│  │ symbol (TEXT)                                      │    │
│  │ status (TEXT)                                      │    │
│  │ raised_amount (NUMERIC) ← Updated by trigger       │    │
│  │ participant_count (INT) ← Updated by trigger       │    │
│  │ hard_cap (NUMERIC)                                 │    │
│  │ presale_start (TIMESTAMPTZ)                        │    │
│  │ presale_end (TIMESTAMPTZ)                          │    │
│  │ ...                                                │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways

### How It Works

1. **UI Layer** (`LaunchpadList.tsx`)
   - Fetches data from service
   - Displays projects and stats
   - Auto-refreshes every 30 seconds

2. **Service Layer** (`launchpadService.ts`)
   - Provides clean API for UI
   - Handles all database queries
   - Validates business logic

3. **Database Layer** (Supabase)
   - Stores projects and transactions
   - Automatic stats updates via triggers
   - Secure with RLS policies

### Data Flow

```
User Action → UI Component → Service Method → Database Query → Return Data → Update UI
```

### Real-time Updates

```
Timer (30s) → Fetch Data → Update State → React Re-render → UI Updates
```

### Transaction Flow

```
Create (pending) → Blockchain Confirm → Update (confirmed) → Trigger Fires → Stats Update + Notification
```

---

**Flow Diagram Complete**  
**Status:** ✅ Ready for Reference  
**Use:** Understanding system architecture

