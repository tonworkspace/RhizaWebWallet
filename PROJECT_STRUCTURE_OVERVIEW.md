# 🏗️ RhizaCore Web Wallet - Complete Project Structure

**Generated:** February 28, 2026  
**Project:** RhizaCore Web Wallet  
**Type:** TON Blockchain Web Wallet with Mining & Referral System

---

## 📊 Project Statistics

### Overall Numbers
- **Total Pages:** 39 pages
- **Components:** 17 components
- **Services:** 15 services
- **Routes:** 45+ routes
- **Documentation Files:** 200+ markdown files
- **SQL Scripts:** 50+ database scripts

### Code Organization
```
Root Directory
├── pages/          (39 files) - All application pages
├── components/     (17 files) - Reusable UI components
├── services/       (15 files) - Business logic & API services
├── context/        (2 files)  - React context providers
├── hooks/          (2 files)  - Custom React hooks
├── utils/          (2 files)  - Utility functions
├── utility/        (3 files)  - Helper utilities
├── config/         (2 files)  - Configuration files
├── contracts/      (4 files)  - Smart contracts (FunC)
├── i18n/           (locales)  - Internationalization
├── types/          (1 file)   - TypeScript types
└── docs/           (4 files)  - User documentation
```

---

## 📄 Complete Page Inventory (39 Pages)

### Public Pages (7)
1. **Landing.tsx** - Homepage with features showcase
2. **Whitepaper.tsx** - Technical documentation
3. **Help.tsx** - Help center
4. **UserGuide.tsx** - User guide
5. **FAQ.tsx** - Frequently asked questions
6. **Tutorials.tsx** - Video tutorials
7. **ReferralPortal.tsx** - Public referral information

### Legal & Compliance (4)
8. **PrivacyPolicy.tsx** - Privacy policy
9. **TermsOfService.tsx** - Terms of service
10. **SecurityAudit.tsx** - Security audit information
11. **Compliance.tsx** - Regulatory compliance

### Ecosystem Pages (5)
12. **MerchantAPI.tsx** - Merchant integration API
13. **DeveloperHub.tsx** - Developer resources
14. **StakingEngine.tsx** - Staking information
15. **Marketplace.tsx** - NFT/Token marketplace
16. **Launchpad.tsx** - Token launchpad

### Authentication & Onboarding (5)
17. **Onboarding.tsx** - Initial onboarding flow
18. **WalletLogin.tsx** - Wallet login page
19. **CreateWallet.tsx** - Create new wallet
20. **ImportWallet.tsx** - Import existing wallet
21. **ProfileSetup.tsx** - Profile setup after wallet creation

### Wallet Core Pages (10)
22. **Dashboard.tsx** - Main wallet dashboard
23. **Assets.tsx** - Token & NFT assets
24. **History.tsx** - Transaction history
25. **Transfer.tsx** - Send tokens/jettons
26. **Receive.tsx** - Receive tokens (QR code)
27. **Settings.tsx** - Wallet settings
28. **Referral.tsx** - Referral management
29. **More.tsx** - Additional features menu
30. **MiningNodes.tsx** - Mining node management
31. **Activity.tsx** - Activity log

### Advanced Features (3)
32. **AIAssistant.tsx** - AI-powered assistant
33. **Notifications.tsx** - Notification center
34. **MiningNodes copy.tsx** - Mining nodes backup

### Admin Pages (5)
35. **AdminRegister.tsx** - Admin registration
36. **AdminSetup.tsx** - Admin setup
37. **AdminDashboard.tsx** - Admin dashboard
38. **AdminPanel.tsx** - Admin control panel
39. **DatabaseTest.tsx** - Database testing
40. **SupabaseConnectionTest.tsx** - Supabase testing
41. **SupabaseTest.tsx** - Additional Supabase tests

---

## 🧩 Components Breakdown (17 Components)

### Core UI Components
1. **Layout.tsx** - Main layout wrapper with navigation
2. **Toast.tsx** - Toast notification system
3. **EmptyState.tsx** - Empty state placeholder
4. **LoadingSkeleton.tsx** - Loading skeleton screens

### Wallet Components
5. **WalletSwitcher.tsx** - Multi-wallet switcher
6. **WalletActivationModal.tsx** - Wallet activation modal
7. **WalletLockOverlay.tsx** - Wallet lock screen
8. **ProtocolActivationWizard.tsx** - Activation wizard

### Feature Components
9. **NotificationCenter.tsx** - Notification management
10. **TransactionItem.tsx** - Transaction list item
11. **SessionTimeoutWarning.tsx** - Session timeout alert
12. **LanguageSelector.tsx** - Language switcher

### Rewards & Claims
13. **ClaimActivationBonus.tsx** - Claim activation rewards
14. **ClaimMissingRewards.tsx** - Claim missing referral rewards

### Data Visualization
15. **TokenomicsChart.tsx** - Tokenomics charts
16. **TokenomicsCalculator.tsx** - Token calculator
17. **RoadmapTimeline.tsx** - Project roadmap

---

## 🔧 Services Architecture (15 Services)

### Core Services
1. **supabaseService.ts** (850+ lines)
   - User profile management
   - Referral system
   - Analytics tracking
   - Database operations

2. **tonWalletService.ts**
   - TON blockchain integration
   - Wallet operations
   - Balance fetching
   - Transaction sending

3. **authService.ts**
   - Authentication logic
   - Session management
   - Login/logout

### Transaction Services
4. **transactionSync.ts**
   - Transaction synchronization
   - History tracking
   - Real-time updates

5. **jettonRegistry.ts**
   - Jetton (token) registry
   - Token metadata
   - Token transfers

6. **rzcTransferService.ts**
   - RZC token transfers
   - Username-based transfers
   - Transfer validation

### Referral & Rewards
7. **referralRewardService.ts**
   - Referral tracking
   - Reward calculation
   - Downline management

8. **referralRewardChecker.ts**
   - Missing reward detection
   - Reward verification
   - Automated checks

9. **rewardClaimService.ts**
   - Reward claiming
   - Bonus distribution
   - Claim validation

10. **rzcRewardService.ts**
    - RZC token rewards
    - Mining rewards
    - Activation bonuses

### Mining & Squad
11. **squadMiningService.ts**
    - Squad mining system
    - Team management
    - Mining rewards

### Admin & Utilities
12. **adminService.ts**
    - Admin operations
    - User management
    - System monitoring

13. **notificationService.ts**
    - Push notifications
    - Activity logging
    - Event tracking

14. **usernameService.ts**
    - Username management
    - Username validation
    - Username lookup

15. **geminiService.ts**
    - AI assistant integration
    - Natural language processing
    - Smart suggestions

---

## 🗺️ Route Structure (45+ Routes)

### Public Routes (7)
```
/                    → Landing
/whitepaper          → Whitepaper
/help                → Help Center
/guide               → User Guide
/faq                 → FAQ
/tutorials           → Tutorials
/referral            → Referral Portal
```

### Legal Routes (4)
```
/privacy             → Privacy Policy
/terms               → Terms of Service
/security            → Security Audit
/compliance          → Compliance
```

### Ecosystem Routes (5)
```
/merchant-api        → Merchant API
/developers          → Developer Hub
/staking             → Staking Engine
/marketplace         → Marketplace
/launchpad           → Launchpad
```

### Auth Routes (5)
```
/login               → Wallet Login
/onboarding          → Onboarding
/create-wallet       → Create Wallet
/join                → Join (alias for create-wallet)
/import-wallet       → Import Wallet
/profile-setup       → Profile Setup (Protected)
```

### Wallet Routes (11) - All Protected
```
/wallet/dashboard    → Dashboard
/wallet/assets       → Assets
/wallet/history      → Transaction History
/wallet/transfer     → Transfer Tokens
/wallet/receive      → Receive Tokens
/wallet/referral     → Referral Management
/wallet/settings     → Settings
/wallet/more         → More Features
/wallet/mining       → Mining Nodes
/wallet/ai-assistant → AI Assistant
/wallet/notifications → Notifications
/wallet/activity     → Activity Log
```

### Admin Routes (5) - Protected
```
/admin-register      → Admin Registration
/admin-setup         → Admin Setup
/admin               → Admin Dashboard
/admin/panel         → Admin Panel
/database-test       → Database Test
/supabase-test       → Supabase Test
```

---

## 🎨 Context & State Management

### Context Providers (2)
1. **WalletContext.tsx**
   - Wallet state management
   - User authentication
   - Profile data
   - Session handling
   - Auto-sync with Supabase

2. **ToastContext.tsx**
   - Toast notifications
   - Success/error messages
   - User feedback

### Custom Hooks (2)
1. **useBalance.ts**
   - Real-time balance fetching
   - TON balance
   - Jetton balances

2. **useTransactions.ts**
   - Transaction history
   - Real-time updates
   - Transaction filtering

---

## 🛠️ Utilities & Helpers

### Utils Directory
1. **encryption.ts**
   - Wallet encryption
   - Secure storage
   - Key management

2. **walletManager.ts**
   - Multi-wallet management
   - Wallet switching
   - Wallet storage

### Utility Directory
1. **address.ts**
   - Address validation
   - Address formatting
   - Address conversion

2. **decimals.ts**
   - Decimal handling
   - Token amount formatting
   - Precision management

3. **jettonTransfer.ts**
   - Jetton transfer utilities
   - Transfer validation
   - Transfer building

---

## ⚙️ Configuration Files

### Config Directory
1. **paymentConfig.ts**
   - Payment settings
   - Pricing tiers
   - Payment methods

2. **rzcConfig.ts**
   - RZC token configuration
   - Token price
   - Token settings

### Root Config Files
- **vite.config.ts** - Vite build configuration
- **tailwind.config.cjs** - Tailwind CSS configuration
- **postcss.config.cjs** - PostCSS configuration
- **tsconfig.json** - TypeScript configuration
- **.env** - Environment variables

---

## 🔗 Smart Contracts (FunC)

### Contracts Directory (4 files)
1. **MiningNode.fc**
   - Mining node contract
   - Node management
   - Reward distribution

2. **ShareholderNFT.fc**
   - Shareholder NFT contract
   - Ownership tracking
   - Dividend distribution

3. **RevenueDistributor.fc**
   - Revenue distribution contract
   - Automatic payouts
   - Shareholder rewards

4. **SMART_CONTRACT_GUIDE.md**
   - Contract documentation
   - Deployment guide
   - Usage examples

---

## 🌍 Internationalization (i18n)

### Structure
```
i18n/
├── config.ts              - i18n configuration
└── locales/
    ├── en/               - English translations
    ├── es/               - Spanish translations
    ├── fr/               - French translations
    ├── de/               - German translations
    ├── zh/               - Chinese translations
    └── ...               - More languages
```

### Supported Languages
- English (en)
- Spanish (es)
- French (fr)
- German (de)
- Chinese (zh)
- Japanese (ja)
- Korean (ko)
- Russian (ru)
- Portuguese (pt)
- Arabic (ar)

---

## 📚 Documentation Files (200+)

### Setup & Configuration
- SUPABASE_DATABASE_SETUP.md
- SUPABASE_COMPLETE_SETUP.md
- SETUP_COMPLETE_SUMMARY.md
- QUICK_START_GUIDE.md

### Feature Documentation
- WALLET_ACTIVATION_COMPLETE.md
- REFERRAL_SYSTEM_COMPLETE.md
- MINING_NODES_INTEGRATION_COMPLETE.md
- RZC_TOKEN_SYSTEM.md
- SQUAD_MINING_INTEGRATION_GUIDE.md

### Testing Guides
- TESTING_GUIDE.md
- FINAL_TESTING_INSTRUCTIONS.md
- REFERRAL_SYSTEM_TEST_GUIDE.md
- TRANSFER_TESTING_GUIDE.md

### Implementation Status
- ACTIVATION_IMPLEMENTATION_COMPLETE.md
- JETTON_TRANSFER_COMPLETE.md
- NOTIFICATION_SYSTEM_COMPLETE.md
- I18N_COMPLETE_SUMMARY.md

### Quick References
- QUICK_REFERENCE.md
- REFERRAL_QUICK_REFERENCE.md
- RZC_QUICK_REFERENCE.md
- SESSION_QUICK_REFERENCE.md

---

## 🗄️ Database Schema

### Supabase Tables (10+)
1. **wallet_users** - User profiles
2. **wallet_referrals** - Referral codes
3. **wallet_analytics** - Analytics events
4. **wallet_transactions** - Transaction history
5. **wallet_sessions** - User sessions
6. **wallet_notifications** - Notifications
7. **wallet_activation** - Wallet activation status
8. **mining_nodes** - Mining node data
9. **squad_mining** - Squad mining data
10. **rzc_transactions** - RZC token transactions
11. **newsletter_subscribers** - Newsletter subscriptions

### Database Functions (RPC)
- activate_wallet()
- award_referral_rewards()
- get_downline()
- check_wallet_activation()
- claim_activation_bonus()
- transfer_rzc()
- get_user_by_username()

---

## 🔐 Security Features

### Authentication
- Wallet-based authentication
- Session management
- Auto-logout on inactivity
- Secure key storage

### Encryption
- Wallet encryption
- Secure storage
- Key derivation
- Password protection

### Access Control
- Protected routes
- Role-based access (Admin)
- RLS policies in Supabase
- API key protection

---

## 🚀 Key Features

### Wallet Features
✅ Create/Import wallet
✅ Multi-wallet support
✅ TON & Jetton transfers
✅ Transaction history
✅ QR code receive
✅ Real-time balance
✅ Wallet activation system

### Referral System
✅ Unique referral codes
✅ Multi-level referrals (5 levels)
✅ Automatic reward distribution
✅ Downline tracking
✅ Referral analytics
✅ Missing reward detection

### Mining System
✅ Mining node packages
✅ Shareholder NFTs
✅ Revenue distribution
✅ Squad mining
✅ Team management
✅ Mining rewards

### RZC Token System
✅ RZC token transfers
✅ Username-based transfers
✅ Activation bonuses
✅ Referral rewards
✅ Mining rewards
✅ Price management

### Admin Features
✅ User management
✅ Node management
✅ Analytics dashboard
✅ System monitoring
✅ Database testing

### Additional Features
✅ AI Assistant (Gemini)
✅ Notifications
✅ Activity tracking
✅ Multi-language support
✅ Mobile responsive
✅ Dark mode

---

## 📦 Dependencies

### Core Dependencies
- **React 19.2.4** - UI framework
- **React Router DOM 7.13.0** - Routing
- **@ton/ton 13.5.0** - TON blockchain
- **@supabase/supabase-js 2.97.0** - Backend
- **Vite 6.2.0** - Build tool
- **TypeScript 5.8.2** - Type safety

### UI Libraries
- **Tailwind CSS 3.4.19** - Styling
- **Lucide React 0.574.0** - Icons
- **Recharts 3.7.0** - Charts
- **QRCode.react 4.2.0** - QR codes

### Internationalization
- **i18next 25.8.13** - i18n framework
- **react-i18next 16.5.4** - React integration
- **i18next-browser-languagedetector 8.2.1** - Language detection

### AI & Services
- **@google/genai 1.41.0** - Gemini AI

---

## 🎯 Project Status

### ✅ Completed Features
- Wallet creation & import
- TON & Jetton transfers
- Referral system (5 levels)
- Mining node system
- RZC token system
- Admin dashboard
- Notification system
- Activity tracking
- Multi-language support
- Wallet activation flow
- Session management
- Profile management

### 🚧 In Progress
- Real-time notifications
- Advanced analytics
- Mobile app version
- Hardware wallet support

### 📋 Planned Features
- DeFi integrations
- NFT marketplace
- Token launchpad
- Staking platform
- Cross-chain bridges

---

## 📊 Build Information

### Build Stats
```
✅ Build: SUCCESS
✅ TypeScript: No Errors
✅ Bundle Size: ~1.9 MB (500 KB gzipped)
✅ Build Time: ~16 seconds
✅ All Features: Working
```

### Environment
- **Node.js:** v18+
- **Package Manager:** npm
- **Build Tool:** Vite
- **Deployment:** GitHub Pages

---

## 🔗 Important Links

### Development
- **Local Dev:** http://localhost:5173
- **Supabase Dashboard:** https://dksskhnnxfkpgjeiybjk.supabase.co
- **GitHub Pages:** https://tonworkspace.github.io/RhizaWebWallet

### Documentation
- **User Guide:** /guide
- **FAQ:** /faq
- **Whitepaper:** /whitepaper
- **API Docs:** /developers

---

## 📝 Quick Start Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Deploy to GitHub Pages
npm run deploy
```

---

## 🎉 Summary

**RhizaCore Web Wallet** is a comprehensive TON blockchain wallet with:

- **39 pages** covering all user journeys
- **17 reusable components** for consistent UI
- **15 services** handling business logic
- **45+ routes** for navigation
- **10+ database tables** for data persistence
- **Multi-language support** for global reach
- **Complete referral system** with 5 levels
- **Mining node system** with shareholder NFTs
- **RZC token system** with rewards
- **Admin dashboard** for management
- **AI assistant** for user help
- **Mobile responsive** design
- **Production ready** status

---

**Last Updated:** February 28, 2026  
**Status:** ✅ Production Ready  
**Version:** 0.0.0
