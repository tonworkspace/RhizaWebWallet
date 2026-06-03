-- Verify Round 3 price is $0.25 (not $0.025)
SELECT 
    round_number,
    round_name,
    price_usd,
    token_cap,
    tokens_sold,
    is_active,
    is_complete
FROM sale_rounds
WHERE round_number = 3;
