# Architecture

## Overview
Rhiza Web Wallet is a client-side React application integrated with a decentralized blockchain backend (TON) and a centralized backend-as-a-service (Supabase).

## Core Systems
1. **Frontend**: React SPA via Vite.
2. **Blockchain Layer (TON)**: Connects via `@ton/ton` relying on TonCenter/TonAPI for RPC and data.
3. **Database & Auth (Supabase)**: Handles user authentication, referral tracking, session persistence, airdrops, and off-chain data.
4. **Smart Contracts**: Uses custom TON smart contracts for RZC tokens, Jetton routing, and mining operations.

## Key Architectural Patterns
- **Service Layer**: Separation of concerns heavily relies on services (e.g., `tonWalletService.ts`, `supabaseService.ts`) abstracted away from components.
- **Context API/Hooks**: Global state management via `WalletContext.tsx` and custom React hooks (`useTransactions.ts`).
- **Hybrid Security Model**: On-chain autonomy combined with robust localized encryption (e.g., device-specific key storage for phrases).
