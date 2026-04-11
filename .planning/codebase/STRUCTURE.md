# Structure

## Directory Layout
- `/components` - Modular, reusable UI building blocks (e.g., Modal, Overlay, Typography).
- `/config` - Application configs spanning features like API overrides or network specifics.
- `/context` - Global state providers (`WalletContext`, Auth).
- `/contracts` - TON Smart contract structures & guides.
- `/hooks` - Custom React hooks (`useTransactions`, etc.).
- `/i18n` - Internationalization config and dictionaries.
- `/pages` - Top-level page route definitions (e.g., `AssetDetail.tsx`, `Referral.tsx`, `SecondaryWallet.tsx`).
- `/services` - Essential abstraction layer holding the core logic to communicate with external APIs (`supabaseService.ts`, `tonWalletService.ts`, `tetherWdkService.ts`).
- `/utility` / `/utils` - Pure helper functions (encryption, sanitization).
- `/public` - Static assets including font/imagery/SVG.
- `/docs` & root `.md` files - Comprehensive changelog and manual setups mapped over time.
- `/*.sql` - Standalone DB definitions natively ready to be executed against Supabase.
