-- Check current ICO round prices in database
SELECT 
    round_number,
    round_name,
    price_usd,
    next_round_price,
    token_cap,
    tokens_sold,
    is_active,
    is_complete
FROM sale_rounds
ORDER BY round_number;

-- Also check what get_active_sale_round returns
SELECT * FROM get_active_sale_round();
