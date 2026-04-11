-- Migration: Initialize Asset Rates in rzc_config
-- Description: Adds all relevant asset rates to the configuration table for admin management

-- Ensure the table exists (it should, but just in case)
CREATE TABLE IF NOT EXISTS rzc_config (
    key TEXT PRIMARY KEY,
    value NUMERIC NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by TEXT
);

-- Enable RLS if not already enabled
ALTER TABLE rzc_config ENABLE ROW LEVEL SECURITY;

-- Create policy for public read if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'rzc_config' AND policyname = 'Allow public read access to rzc_config'
    ) THEN
        CREATE POLICY "Allow public read access to rzc_config" 
        ON rzc_config FOR SELECT 
        USING (true);
    END IF;
END $$;

-- Create policy for admin write if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'rzc_config' AND policyname = 'Allow admin write access to rzc_config'
    ) THEN
        CREATE POLICY "Allow admin write access to rzc_config" 
        ON rzc_config FOR ALL 
        USING (
            EXISTS (
                SELECT 1 FROM wallet_users 
                WHERE wallet_address = auth.jwt() ->> 'sub' -- Note: This might need adjustment based on how auth is handled
                AND role IN ('admin', 'super_admin')
            )
        );
    END IF;
END $$;

-- Initialize or update asset rates
INSERT INTO rzc_config (key, value, updated_by)
VALUES 
    ('RZC_PRICE', 0.25, 'system_init'),
    ('TON_PRICE', 5.42, 'system_init'),
    ('BTC_PRICE', 64320.50, 'system_init'),
    ('ETH_PRICE', 3450.25, 'system_init'),
    ('SOL_PRICE', 145.80, 'system_init'),
    ('TRX_PRICE', 0.12, 'system_init'),
    ('USDT_PRICE', 1.0, 'system_init'),
    ('USDC_PRICE', 1.0, 'system_init'),
    ('NOT_PRICE', 0.0082, 'system_init'),
    ('SCALE_PRICE', 0.55, 'system_init'),
    ('STK_PRICE', 0.15, 'system_init')
ON CONFLICT (key) DO UPDATE 
SET updated_at = NOW();

-- Create/Update a function to get all rates as JSON for convenience
CREATE OR REPLACE FUNCTION get_all_asset_rates()
RETURNS JSONB AS $$
DECLARE
    rates_json JSONB;
BEGIN
    SELECT jsonb_object_agg(key, value) INTO rates_json FROM rzc_config;
    RETURN rates_json;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create/Update a function to update a specific rate (admin only check inside)
CREATE OR REPLACE FUNCTION set_asset_rate(p_key TEXT, p_value NUMERIC, p_admin_wallet TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if sender is admin
    IF NOT EXISTS (SELECT 1 FROM wallet_users WHERE wallet_address = p_admin_wallet AND role IN ('admin', 'super_admin')) THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can update asset rates';
    END IF;

    INSERT INTO rzc_config (key, value, updated_at, updated_by)
    VALUES (p_key, p_value, NOW(), p_admin_wallet)
    ON CONFLICT (key) DO UPDATE 
    SET value = EXCLUDED.value, 
        updated_at = EXCLUDED.updated_at,
        updated_by = EXCLUDED.updated_by;
        
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
