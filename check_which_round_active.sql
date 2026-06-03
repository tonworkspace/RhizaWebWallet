-- ═══════════════════════════════════════════════════════════════════════════════
-- Check Which Round is Currently Active
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── Show all rounds with detailed status ──────────────────────────────────────
SELECT 
    round_number,
    round_name,
    price_usd,
    token_cap,
    tokens_sold,
    token_cap - tokens_sold AS tokens_remaining,
    ROUND((tokens_sold::numeric / NULLIF(token_cap, 0)) * 100, 2) AS progress_pct,
    is_active,
    is_complete,
    start_date::date AS start_date,
    end_date::date AS end_date,
    CASE 
        WHEN is_active THEN '🟢 ACTIVE'
        WHEN is_complete THEN '✅ COMPLETE'
        ELSE '⏸️ PENDING'
    END AS status
FROM sale_rounds
ORDER BY round_number;

-- ── Count active rounds ───────────────────────────────────────────────────────
SELECT 
    COUNT(*) FILTER (WHERE is_active = true) AS active_rounds,
    COUNT(*) FILTER (WHERE is_complete = true) AS completed_rounds,
    COUNT(*) FILTER (WHERE is_active = false AND is_complete = false) AS pending_rounds
FROM sale_rounds;

-- ── Show only the active round ────────────────────────────────────────────────
SELECT 
    round_number,
    round_name,
    price_usd,
    token_cap,
    tokens_sold,
    token_cap - tokens_sold AS tokens_remaining
FROM sale_rounds
WHERE is_active = true;

-- ── Test what the app sees ────────────────────────────────────────────────────
SELECT get_active_sale_round();
