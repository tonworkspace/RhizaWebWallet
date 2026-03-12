-- ============================================================================
-- ADD STK WALLET ADDRESS AND NFT TOKEN ID FIELDS
-- ============================================================================
-- Run this if you already created the stk_migrations table
-- This adds the new required fields
-- ============================================================================

-- Add new columns if they don't exist
DO $$ 
BEGIN
    -- Add stk_wallet_address column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'stk_migrations' 
        AND column_name = 'stk_wallet_address'
    ) THEN
        ALTER TABLE public.stk_migrations 
        ADD COLUMN stk_wallet_address TEXT;
        
        RAISE NOTICE '✅ Added stk_wallet_address column';
    ELSE
        RAISE NOTICE 'ℹ️  stk_wallet_address column already exists';
    END IF;

    -- Add nft_token_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'stk_migrations' 
        AND column_name = 'nft_token_id'
    ) THEN
        ALTER TABLE public.stk_migrations 
        ADD COLUMN nft_token_id TEXT;
        
        RAISE NOTICE '✅ Added nft_token_id column';
    ELSE
        RAISE NOTICE 'ℹ️  nft_token_id column already exists';
    END IF;
END $$;

-- Make columns NOT NULL after adding them
-- (Only if there's no existing data, or update existing rows first)
DO $$
DECLARE
    row_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO row_count FROM public.stk_migrations;
    
    IF row_count = 0 THEN
        -- No data, safe to add NOT NULL constraint
        ALTER TABLE public.stk_migrations 
        ALTER COLUMN stk_wallet_address SET NOT NULL;
        
        ALTER TABLE public.stk_migrations 
        ALTER COLUMN nft_token_id SET NOT NULL;
        
        RAISE NOTICE '✅ Added NOT NULL constraints';
    ELSE
        RAISE NOTICE '⚠️  Table has % rows. Please update existing rows before adding NOT NULL constraints', row_count;
        RAISE NOTICE '   Run: UPDATE public.stk_migrations SET stk_wallet_address = ''PENDING'', nft_token_id = ''PENDING'' WHERE stk_wallet_address IS NULL;';
    END IF;
END $$;

-- Verify the changes
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'stk_migrations'
AND column_name IN ('stk_wallet_address', 'nft_token_id')
ORDER BY ordinal_position;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '   STK MIGRATION FIELDS UPDATED';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '✅ stk_wallet_address field added';
    RAISE NOTICE '✅ nft_token_id field added';
    RAISE NOTICE '';
    RAISE NOTICE '📝 Users must now provide:';
    RAISE NOTICE '   • Telegram username';
    RAISE NOTICE '   • Mobile number';
    RAISE NOTICE '   • STK wallet address';
    RAISE NOTICE '   • NFT Token ID';
    RAISE NOTICE '   • STK amount';
    RAISE NOTICE '';
END $$;
