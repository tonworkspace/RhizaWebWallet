-- ============================================================================
-- TWO-TIER ACTIVATION SYSTEM
-- ============================================================================
-- Tier 1: Store Activation ($10) - Unlocks wallet features (Easter Egg)
-- Tier 2: Node Activation ($18) - Unlocks full node benefits & milestone
-- ============================================================================
-- IMPORTANT: This migration drops and recreates activate_wallet_atomic()
-- The old function had 5 parameters, the new one has 6 (added activation_source)
-- ============================================================================

-- Add node activation tracking columns to wallet_users
ALTER TABLE wallet_users 
ADD COLUMN IF NOT EXISTS node_activated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS node_activated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS total_activation_spent NUMERIC DEFAULT 0;

-- Add node activation tracking to wallet_activations
ALTER TABLE wallet_activations
ADD COLUMN IF NOT EXISTS node_activated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS node_activated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS total_spent NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS activation_source TEXT; -- 'store', 'package', 'direct'

-- Create index for node activation queries
CREATE INDEX IF NOT EXISTS idx_wallet_users_node_activated ON wallet_users(node_activated);
CREATE INDEX IF NOT EXISTS idx_wallet_activations_node_activated ON wallet_activations(node_activated);

-- ============================================================================
-- UPDATED ATOMIC ACTIVATION FUNCTION (Two-Tier System)
-- ============================================================================

-- Drop the old function first (with 5 parameters)
DROP FUNCTION IF EXISTS activate_wallet_atomic(TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT);

-- Create new function with 6 parameters (added p_activation_source)
CREATE OR REPLACE FUNCTION activate_wallet_atomic(
    p_wallet_address TEXT,
    p_activation_fee_usd NUMERIC,
    p_activation_fee_ton NUMERIC,
    p_ton_price NUMERIC,
    p_transaction_hash TEXT,
    p_activation_source TEXT DEFAULT 'store' -- 'store', 'package', 'direct'
) RETURNS JSON AS $$
DECLARE
    v_user_id UUID;
    v_result JSON;
    v_already_activated BOOLEAN;
    v_node_activated BOOLEAN;
    v_total_spent NUMERIC;
    v_remaining_for_node NUMERIC;
    v_node_milestone_reached BOOLEAN;
BEGIN
    -- Start atomic transaction
    BEGIN
        -- Normalize wallet address
        p_wallet_address := TRIM(p_wallet_address);

        -- Check current activation status
        SELECT 
            wu.is_activated,
            wu.node_activated,
            COALESCE(wu.total_activation_spent, 0)
        INTO v_already_activated, v_node_activated, v_total_spent
        FROM wallet_users wu
        WHERE wu.wallet_address = p_wallet_address;

        -- Calculate new total spent
        v_total_spent := COALESCE(v_total_spent, 0) + p_activation_fee_usd;
        
        -- Check if node milestone is reached ($18 total)
        v_node_milestone_reached := v_total_spent >= 18;

        -- Get or create user
        SELECT id INTO v_user_id
        FROM wallet_users
        WHERE wallet_address = p_wallet_address;

        IF v_user_id IS NULL THEN
            -- Create new user
            INSERT INTO wallet_users (
                wallet_address,
                name,
                avatar,
                role,
                is_active,
                rzc_balance,
                is_activated,
                activated_at,
                activation_fee_paid,
                node_activated,
                node_activated_at,
                total_activation_spent,
                created_at,
                updated_at
            ) VALUES (
                p_wallet_address,
                'Rhiza User #' || RIGHT(p_wallet_address, 4),
                '🌱',
                'user',
                true,
                0,
                true, -- Always activate wallet (even at $10)
                NOW(),
                p_activation_fee_usd,
                v_node_milestone_reached, -- Node activated only if >= $18
                CASE WHEN v_node_milestone_reached THEN NOW() ELSE NULL END,
                v_total_spent,
                NOW(),
                NOW()
            )
            RETURNING id INTO v_user_id;

            RAISE NOTICE 'Created new user with ID: % | Node Activated: %', v_user_id, v_node_milestone_reached;
        ELSE
            -- Update existing user
            UPDATE wallet_users
            SET 
                is_activated = true,
                activated_at = COALESCE(activated_at, NOW()),
                activation_fee_paid = COALESCE(activation_fee_paid, 0) + p_activation_fee_usd,
                total_activation_spent = v_total_spent,
                node_activated = v_node_milestone_reached,
                node_activated_at = CASE 
                    WHEN v_node_milestone_reached AND node_activated_at IS NULL 
                    THEN NOW() 
                    ELSE node_activated_at 
                END,
                updated_at = NOW()
            WHERE id = v_user_id;

            RAISE NOTICE 'Updated user ID: % | Total Spent: % | Node Activated: %', 
                v_user_id, v_total_spent, v_node_milestone_reached;
        END IF;

        -- Insert or update activation record
        INSERT INTO wallet_activations (
            user_id,
            wallet_address,
            is_activated,
            activated_at,
            activation_fee_usd,
            activation_fee_ton,
            ton_price,
            transaction_hash,
            node_activated,
            node_activated_at,
            total_spent,
            activation_source,
            created_at,
            updated_at
        ) VALUES (
            v_user_id,
            p_wallet_address,
            true,
            NOW(),
            p_activation_fee_usd,
            p_activation_fee_ton,
            p_ton_price,
            p_transaction_hash,
            v_node_milestone_reached,
            CASE WHEN v_node_milestone_reached THEN NOW() ELSE NULL END,
            v_total_spent,
            p_activation_source,
            NOW(),
            NOW()
        )
        ON CONFLICT (user_id) DO UPDATE SET
            is_activated = true,
            activation_fee_usd = wallet_activations.activation_fee_usd + EXCLUDED.activation_fee_usd,
            activation_fee_ton = wallet_activations.activation_fee_ton + EXCLUDED.activation_fee_ton,
            total_spent = v_total_spent,
            node_activated = v_node_milestone_reached,
            node_activated_at = CASE 
                WHEN v_node_milestone_reached AND wallet_activations.node_activated_at IS NULL 
                THEN NOW() 
                ELSE wallet_activations.node_activated_at 
            END,
            transaction_hash = EXCLUDED.transaction_hash,
            updated_at = NOW();

        -- Create referral code if it doesn't exist
        INSERT INTO wallet_referrals (
            user_id,
            referral_code,
            total_earned,
            total_referrals,
            rank,
            level,
            created_at,
            updated_at
        ) VALUES (
            v_user_id,
            UPPER(RIGHT(p_wallet_address, 8)),
            0,
            0,
            CASE WHEN v_node_milestone_reached THEN 'Core Node' ELSE 'Starter' END,
            1,
            NOW(),
            NOW()
        )
        ON CONFLICT (user_id) DO UPDATE SET
            rank = CASE 
                WHEN v_node_milestone_reached THEN 'Core Node' 
                ELSE wallet_referrals.rank 
            END,
            updated_at = NOW();

        -- Calculate remaining amount for node milestone
        v_remaining_for_node := GREATEST(18 - v_total_spent, 0);

        -- Return success with milestone info
        v_result := json_build_object(
            'success', true,
            'user_id', v_user_id,
            'wallet_address', p_wallet_address,
            'activated_at', NOW(),
            'activation_fee_usd', p_activation_fee_usd,
            'total_spent', v_total_spent,
            'node_activated', v_node_milestone_reached,
            'remaining_for_node', v_remaining_for_node,
            'transaction_hash', p_transaction_hash,
            'message', CASE 
                WHEN v_node_milestone_reached THEN 'Wallet activated and node milestone reached!'
                ELSE 'Wallet activated! Spend $' || v_remaining_for_node::TEXT || ' more to reach node milestone.'
            END
        );

        RETURN v_result;

    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Activation failed for wallet %: %', p_wallet_address, SQLERRM;
        
        v_result := json_build_object(
            'success', false,
            'error', SQLERRM,
            'error_detail', SQLSTATE,
            'wallet_address', p_wallet_address,
            'message', 'Activation failed - transaction rolled back'
        );
        
        RETURN v_result;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION activate_wallet_atomic(TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION activate_wallet_atomic(TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT) TO anon;

COMMENT ON FUNCTION activate_wallet_atomic IS 'Two-tier activation: $10 unlocks wallet, $18 total unlocks node milestone';

-- ============================================================================
-- CHECK NODE MILESTONE STATUS
-- ============================================================================

CREATE OR REPLACE FUNCTION check_node_milestone_status(p_wallet_address TEXT)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'is_activated', COALESCE(wu.is_activated, false),
        'node_activated', COALESCE(wu.node_activated, false),
        'total_spent', COALESCE(wu.total_activation_spent, 0),
        'remaining_for_node', GREATEST(18 - COALESCE(wu.total_activation_spent, 0), 0),
        'activated_at', wu.activated_at,
        'node_activated_at', wu.node_activated_at,
        'user_id', wu.id
    ) INTO v_result
    FROM wallet_users wu
    WHERE wu.wallet_address = p_wallet_address;

    IF v_result IS NULL THEN
        v_result := json_build_object(
            'is_activated', false,
            'node_activated', false,
            'total_spent', 0,
            'remaining_for_node', 18,
            'activated_at', NULL,
            'node_activated_at', NULL,
            'user_id', NULL
        );
    END IF;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_node_milestone_status(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_node_milestone_status(TEXT) TO anon;

COMMENT ON FUNCTION check_node_milestone_status IS 'Check wallet and node activation status with remaining amount';

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN wallet_users.node_activated IS 'True when user has spent $18+ total (node milestone)';
COMMENT ON COLUMN wallet_users.node_activated_at IS 'Timestamp when node milestone was reached';
COMMENT ON COLUMN wallet_users.total_activation_spent IS 'Total amount spent on activations (cumulative)';
COMMENT ON COLUMN wallet_activations.activation_source IS 'Source of activation: store, package, or direct';

-- ============================================================================
-- EXAMPLE USAGE
-- ============================================================================

-- Example 1: User buys $10 in store (wallet activated, node NOT activated)
-- SELECT activate_wallet_atomic(
--     'UQTest123456789',
--     10.00,
--     0.27,
--     37.00,
--     'tx_hash_001',
--     'store'
-- );
-- Result: { "node_activated": false, "remaining_for_node": 8, "message": "Wallet activated! Spend $8 more to reach node milestone." }

-- Example 2: Same user buys $8 more (node milestone reached)
-- SELECT activate_wallet_atomic(
--     'UQTest123456789',
--     8.00,
--     0.22,
--     36.50,
--     'tx_hash_002',
--     'store'
-- );
-- Result: { "node_activated": true, "total_spent": 18, "message": "Wallet activated and node milestone reached!" }

-- Example 3: New user buys $18 activation package directly (both activated)
-- SELECT activate_wallet_atomic(
--     'UQNewUser999',
--     18.00,
--     0.5,
--     36.00,
--     'tx_hash_003',
--     'package'
-- );
-- Result: { "node_activated": true, "total_spent": 18, "message": "Wallet activated and node milestone reached!" }

-- Example 4: Check milestone status
-- SELECT check_node_milestone_status('UQTest123456789');
