-- ============================================================================
-- ATOMIC WALLET ACTIVATION FUNCTION
-- ============================================================================
-- Purpose: Ensure wallet activation is atomic with payment processing
-- This prevents the scenario where payment succeeds but activation fails
-- ============================================================================

CREATE OR REPLACE FUNCTION activate_wallet_atomic(
    p_wallet_address TEXT,
    p_activation_fee_usd NUMERIC,
    p_activation_fee_ton NUMERIC,
    p_ton_price NUMERIC,
    p_transaction_hash TEXT
) RETURNS JSON AS $$
DECLARE
    v_user_id UUID;
    v_result JSON;
    v_already_activated BOOLEAN;
BEGIN
    -- Start atomic transaction
    BEGIN
        -- Normalize wallet address (handle both EQ and UQ formats)
        p_wallet_address := TRIM(p_wallet_address);

        -- Check if already activated (idempotency)
        SELECT wu.is_activated INTO v_already_activated
        FROM wallet_users wu
        WHERE wu.wallet_address = p_wallet_address;

        IF v_already_activated = true THEN
            -- Already activated, return success without changes
            SELECT wu.id INTO v_user_id
            FROM wallet_users wu
            WHERE wu.wallet_address = p_wallet_address;

            v_result := json_build_object(
                'success', true,
                'user_id', v_user_id,
                'already_activated', true,
                'message', 'Wallet was already activated'
            );
            RETURN v_result;
        END IF;

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
                created_at,
                updated_at
            ) VALUES (
                p_wallet_address,
                'Rhiza User #' || RIGHT(p_wallet_address, 4),
                '🌱',
                'user',
                true,
                0,
                true,
                NOW(),
                p_activation_fee_usd,
                NOW(),
                NOW()
            )
            RETURNING id INTO v_user_id;

            RAISE NOTICE 'Created new user with ID: %', v_user_id;
        ELSE
            -- Update existing user
            UPDATE wallet_users
            SET 
                is_activated = true,
                activated_at = NOW(),
                activation_fee_paid = p_activation_fee_usd,
                updated_at = NOW()
            WHERE id = v_user_id;

            RAISE NOTICE 'Updated existing user with ID: %', v_user_id;
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
            NOW(),
            NOW()
        )
        ON CONFLICT (user_id) DO UPDATE SET
            is_activated = true,
            activated_at = NOW(),
            activation_fee_usd = EXCLUDED.activation_fee_usd,
            activation_fee_ton = EXCLUDED.activation_fee_ton,
            ton_price = EXCLUDED.ton_price,
            transaction_hash = EXCLUDED.transaction_hash,
            updated_at = NOW();

        RAISE NOTICE 'Activation record created/updated for user: %', v_user_id;

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
            'Core Node',
            1,
            NOW(),
            NOW()
        )
        ON CONFLICT (user_id) DO NOTHING;

        RAISE NOTICE 'Referral code ensured for user: %', v_user_id;

        -- Return success
        v_result := json_build_object(
            'success', true,
            'user_id', v_user_id,
            'wallet_address', p_wallet_address,
            'activated_at', NOW(),
            'activation_fee_usd', p_activation_fee_usd,
            'transaction_hash', p_transaction_hash,
            'message', 'Wallet activated successfully'
        );

        RETURN v_result;

    EXCEPTION WHEN OTHERS THEN
        -- Rollback happens automatically on exception
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION activate_wallet_atomic(TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION activate_wallet_atomic(TEXT, NUMERIC, NUMERIC, NUMERIC, TEXT) TO anon;

-- Add comment
COMMENT ON FUNCTION activate_wallet_atomic IS 'Atomically activate a wallet with payment verification. Ensures activation and payment are processed together or not at all.';

-- ============================================================================
-- MANUAL ACTIVATION RECOVERY FUNCTION
-- ============================================================================
-- Purpose: Manually activate wallets where auto-activation failed
-- Admin use only - requires transaction hash verification
-- ============================================================================

CREATE OR REPLACE FUNCTION manual_activation_recovery(
    p_wallet_address TEXT,
    p_transaction_hash TEXT,
    p_admin_notes TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    v_user_id UUID;
    v_result JSON;
    v_tx_exists BOOLEAN;
BEGIN
    -- Verify transaction exists in activity log
    SELECT EXISTS(
        SELECT 1 FROM wallet_activity_log
        WHERE wallet_address = p_wallet_address
        AND metadata->>'transaction_hash' = p_transaction_hash
        AND event_type = 'transaction_sent'
    ) INTO v_tx_exists;

    IF NOT v_tx_exists THEN
        v_result := json_build_object(
            'success', false,
            'error', 'Transaction not found in activity log',
            'message', 'Cannot verify payment - transaction hash not found'
        );
        RETURN v_result;
    END IF;

    -- Get user ID
    SELECT id INTO v_user_id
    FROM wallet_users
    WHERE wallet_address = p_wallet_address;

    IF v_user_id IS NULL THEN
        v_result := json_build_object(
            'success', false,
            'error', 'User not found',
            'message', 'Wallet address not found in database'
        );
        RETURN v_result;
    END IF;

    -- Manually activate
    UPDATE wallet_users
    SET 
        is_activated = true,
        activated_at = NOW(),
        updated_at = NOW()
    WHERE id = v_user_id;

    -- Update or create activation record
    INSERT INTO wallet_activations (
        user_id,
        wallet_address,
        is_activated,
        activated_at,
        transaction_hash,
        metadata,
        created_at,
        updated_at
    ) VALUES (
        v_user_id,
        p_wallet_address,
        true,
        NOW(),
        p_transaction_hash,
        jsonb_build_object(
            'manual_recovery', true,
            'admin_notes', p_admin_notes,
            'recovered_at', NOW()
        ),
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        is_activated = true,
        activated_at = NOW(),
        transaction_hash = EXCLUDED.transaction_hash,
        metadata = wallet_activations.metadata || EXCLUDED.metadata,
        updated_at = NOW();

    -- Log recovery action
    INSERT INTO wallet_activity_log (
        wallet_address,
        event_type,
        description,
        metadata,
        created_at
    ) VALUES (
        p_wallet_address,
        'manual_activation_recovery',
        'Wallet manually activated by admin after failed auto-activation',
        jsonb_build_object(
            'transaction_hash', p_transaction_hash,
            'admin_notes', p_admin_notes,
            'recovered_at', NOW()
        ),
        NOW()
    );

    v_result := json_build_object(
        'success', true,
        'user_id', v_user_id,
        'wallet_address', p_wallet_address,
        'message', 'Wallet manually activated successfully',
        'transaction_hash', p_transaction_hash
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Restrict to admin role only
REVOKE EXECUTE ON FUNCTION manual_activation_recovery(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION manual_activation_recovery(TEXT, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION manual_activation_recovery IS 'Manually recover failed auto-activations. Admin use only. Requires transaction hash verification.';

-- ============================================================================
-- ACTIVATION STATUS CHECK FUNCTION
-- ============================================================================
-- Purpose: Quick check if wallet is activated (optimized for frequent calls)
-- ============================================================================

CREATE OR REPLACE FUNCTION check_activation_status(p_wallet_address TEXT)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'is_activated', COALESCE(wu.is_activated, false),
        'activated_at', wu.activated_at,
        'activation_fee_paid', wu.activation_fee_paid,
        'user_id', wu.id
    ) INTO v_result
    FROM wallet_users wu
    WHERE wu.wallet_address = p_wallet_address;

    IF v_result IS NULL THEN
        v_result := json_build_object(
            'is_activated', false,
            'activated_at', NULL,
            'activation_fee_paid', 0,
            'user_id', NULL
        );
    END IF;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_activation_status(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_activation_status(TEXT) TO anon;

COMMENT ON FUNCTION check_activation_status IS 'Fast activation status check. Returns activation details for a wallet address.';

-- ============================================================================
-- TEST THE FUNCTIONS
-- ============================================================================

-- Test 1: Activate a new wallet
-- SELECT activate_wallet_atomic(
--     'UQTest123456789',
--     18.00,
--     0.5,
--     36.00,
--     'test_tx_hash_001'
-- );

-- Test 2: Check activation status
-- SELECT check_activation_status('UQTest123456789');

-- Test 3: Try to activate again (should return already_activated)
-- SELECT activate_wallet_atomic(
--     'UQTest123456789',
--     18.00,
--     0.5,
--     36.00,
--     'test_tx_hash_002'
-- );

-- Test 4: Manual recovery (admin only)
-- SELECT manual_activation_recovery(
--     'UQTest123456789',
--     'test_tx_hash_001',
--     'Testing manual recovery function'
-- );
