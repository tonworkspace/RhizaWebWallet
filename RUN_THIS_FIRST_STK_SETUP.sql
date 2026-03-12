-- ============================================================================
-- STK MIGRATION TABLE SETUP - RUN THIS FIRST
-- ============================================================================
-- Simple, standalone script to create the stk_migrations table
-- Copy and paste this entire script into Supabase SQL Editor and run it
-- ============================================================================

-- Drop table if exists (for clean setup)
DROP TABLE IF EXISTS public.stk_migrations CASCADE;

-- Create stk_migrations table
CREATE TABLE public.stk_migrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT NOT NULL,
    telegram_username TEXT NOT NULL,
    mobile_number TEXT NOT NULL,
    stk_amount NUMERIC NOT NULL CHECK (stk_amount > 0),
    starfi_points NUMERIC NOT NULL CHECK (starfi_points > 0),
    rzc_equivalent NUMERIC NOT NULL CHECK (rzc_equivalent >= 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by TEXT,
    CONSTRAINT unique_wallet_stk_migration UNIQUE (wallet_address)
);

-- Create indexes
CREATE INDEX idx_stk_migrations_wallet ON public.stk_migrations(wallet_address);
CREATE INDEX idx_stk_migrations_status ON public.stk_migrations(status);
CREATE INDEX idx_stk_migrations_created ON public.stk_migrations(created_at DESC);

-- Enable RLS
ALTER TABLE public.stk_migrations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view STK migrations"
    ON public.stk_migrations
    FOR SELECT
    USING (true);

CREATE POLICY "Anyone can insert STK migrations"
    ON public.stk_migrations
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Anyone can update STK migrations"
    ON public.stk_migrations
    FOR UPDATE
    USING (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.stk_migrations TO anon, authenticated;

-- Verify table was created
SELECT 
    'stk_migrations' as table_name,
    COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'stk_migrations';

-- Show success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ STK MIGRATIONS TABLE CREATED!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Table: public.stk_migrations';
    RAISE NOTICE '🔒 RLS: Enabled';
    RAISE NOTICE '💱 Conversion: 10,000,000 STK = 8 RZC';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Ready to use!';
    RAISE NOTICE '';
END $$;
