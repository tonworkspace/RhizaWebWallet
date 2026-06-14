-- Migration to add separate ETH and BNB balance columns to the wallet_users table

ALTER TABLE wallet_users
ADD COLUMN eth_balance numeric DEFAULT 0,
ADD COLUMN bnb_balance numeric DEFAULT 0;

-- Comment on columns for schema documentation
COMMENT ON COLUMN wallet_users.eth_balance IS 'Ethereum (ETH) specific balance cache';
COMMENT ON COLUMN wallet_users.bnb_balance IS 'Binance Smart Chain (BNB) specific balance cache';
