-- ============================================================================
-- FIX: rzc_transactions_amount_check constraint blocks negative amounts
-- The transfer_rzc function inserts -amount for outgoing transfers,
-- but the table has CHECK (amount > 0). Drop the constraint.
-- The 'type' column (transfer_sent / transfer_received) encodes direction.
-- ============================================================================

-- Drop the check constraint
ALTER TABLE rzc_transactions
  DROP CONSTRAINT IF EXISTS rzc_transactions_amount_check;

-- Verify it's gone
SELECT conname
FROM pg_constraint
WHERE conrelid = 'rzc_transactions'::regclass
  AND contype = 'c';

SELECT 'rzc_transactions_amount_check constraint removed — transfers will now work!' AS status;
