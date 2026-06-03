-- ============================================================================
-- ICO ROUND OPERATIONS — Run any of these in Supabase SQL Editor
-- ============================================================================

-- ── CHECK 1: See all rounds and current status ────────────────────────────────
SELECT
  round_number,
  round_name,
  price_usd,
  token_cap,
  tokens_sold,
  token_cap - tokens_sold          AS tokens_remaining,
  ROUND((tokens_sold::numeric / NULLIF(token_cap,0)) * 100, 1) AS sold_pct,
  is_active,
  is_complete,
  start_date::date,
  end_date::date
FROM sale_rounds
ORDER BY round_number;
