# Testing

## Testing Philosophy
- **Unit and Script Tests**: The repo holds substantial raw testing logic within standalone JavaScript files at the root level (e.g., `test_airdrop_system_fixed.js`, `test_wallet_system.js`, `test_duplicate_claim_ui.js`). Most tests heavily utilize runtime fetching over mocked responses.
- **SQL Testing**: Extensive `.sql` script tests are written to test data bounds directly against the Supabase DB schema (e.g., `verify_system_working`, `verify_duplicate_fix.sql`).
- **Integration**: Verifications span UI changes documented explicitly per check (e.g. `TESTING_GUIDE.md`). Tests exist for end-to-end verification.

## Gaps
- Lack of formal automated Unit Test runners like Jest or Vitest embedded directly into `package.json` standard hooks resulting in manual verification script triggering heavily coupled to UI rendering expectations.
