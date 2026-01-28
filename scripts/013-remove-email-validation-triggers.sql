-- Remove email validation triggers from individuals and profiles tables
-- This script removes the automatic email validation triggers that were causing issues

-- Remove trigger from individuals table
DROP TRIGGER IF EXISTS validate_email_trigger ON individuals;

-- Remove trigger from profiles table  
DROP TRIGGER IF EXISTS validate_profile_email_trigger ON profiles;

-- Note: We're keeping the email validation functions (like is_valid_email()) 
-- in case they're still useful for manual validation elsewhere

-- Add a notice that the triggers have been removed
DO $$
BEGIN
    RAISE NOTICE 'Email validation triggers have been successfully removed from individuals and profiles tables';
END $$;
