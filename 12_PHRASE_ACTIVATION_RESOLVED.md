# Wallet Activation Flow Fixed for 12-Phrase Multi-Chain Users

The activation system and Store (Mining Nodes) purchases have been fully updated to support **12-phrase multi-chain wallets**. The following critical fixes were implemented:

## 1. Context Activation Synching (`WalletContext.tsx`)
Previously, `refreshData()` would prematurely abort if the standard 24-phrase `tonWalletService` was not initialized. It now correctly falls back to `tetherWdkService` for Multi-Chain wallets.
- This ensures the global `isActivated` flag reflects accurately upon login.
- Balances are pulled appropriately mapping into the global state so that Node Purchases don't display premature "Low Balance" warnings.
- Syncs the Supabase user profile tracking for Multi-Chains correctly.

## 2. Store & Purchase Routing (`GlobalPurchaseModal.tsx` & `StoreUI.tsx`)
The previous implementation invoked `tonWalletService.sendTransaction` directly, which relies strictly on 24-word wallet initialization. It has now been patched to selectively engage `tetherWdkService`:
- It queries `useWdk = !tonWalletService.isInitialized() && tetherWdkService.isInitialized()`.
- Routes **Node Activation logic** cleanly to `tetherWdkService.sendTonTransaction`.
- Handles commissions safely and tracks them smoothly against the correct WDK API calls (handling sequential processing securely compared to Ton's native multi-message).

With these changes safely written to the codebase, users loading into the application via any valid form of login (Primary 24-phrase or Multi-Chain 12-phrase) will experience a unified Node Purchasing and User Activation flow!
