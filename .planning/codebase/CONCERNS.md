# Concerns

## Current Observations & Risks
1. **API Rate Limiting**: The app currently heavily relies on free-tier APIs (TonCenter/TonAPI) which may pose production bottlenecks handling concurrent users without premium keys.
2. **Secret Management**: Device-specific mnemonic encryption relies on localized browser storage. Storage clearing leads to session invalidation and requires mnemonic re-entry.
3. **Database Complexity**: The SQL migration surface is rapidly expanding with overlapping functionalities (e.g., airdrops, verification checks, squad mining).
4. **Error Handling**: WDK error handling has been improved, but ensuring all RPC failures gracefully degrade remains critical.
5. **Security Configurations**: The app is utilizing various sanitization and replay-attack preventions in `tonWalletService.ts`, which must be continuously updated.
