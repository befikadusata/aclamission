-- Fix Value Date timezone issue by adding 1 day to all existing records
-- This addresses the issue where dates are being stored 1 day behind due to timezone conversion

-- Update all existing bank_transactions to add 1 day to value_date
UPDATE bank_transactions 
SET value_date = value_date + INTERVAL '1 day'
WHERE value_date IS NOT NULL;

-- Also update posting_date and transaction_date if they have the same issue
UPDATE bank_transactions 
SET posting_date = posting_date + INTERVAL '1 day'
WHERE posting_date IS NOT NULL;

UPDATE bank_transactions 
SET transaction_date = transaction_date + INTERVAL '1 day'
WHERE transaction_date IS NOT NULL;

-- Add a comment to track this fix
COMMENT ON COLUMN bank_transactions.value_date IS 'Date field - timezone issue fixed on 2024-01-16 by adding 1 day to all existing records';
