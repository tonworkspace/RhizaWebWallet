-- Add ton_staked column to stk_migrations table
ALTER TABLE stk_migrations
ADD COLUMN IF NOT EXISTS ton_staked DECIMAL(20, 9) DEFAULT 0;

-- Add comment
COMMENT ON COLUMN stk_migrations.ton_staked IS 'Amount of TON tokens staked by the user';

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'stk_migrations'
ORDER BY ordinal_position;
