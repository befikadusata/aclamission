-- Script to add email validation and fix existing invalid emails
-- Created: 2025-06-13

-- 1. Create an email validation function
CREATE OR REPLACE FUNCTION is_valid_email(email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Find and report invalid emails in individuals table
DO $$
DECLARE
  invalid_count INTEGER := 0;
  fixed_count INTEGER := 0;
  rec RECORD;
BEGIN
  -- Create a temporary table to store invalid emails
  CREATE TEMP TABLE invalid_emails (
    id UUID,
    original_email TEXT,
    suggested_fix TEXT
  );
  
  -- Find all invalid emails
  FOR rec IN 
    SELECT id, email 
    FROM individuals 
    WHERE email IS NOT NULL 
    AND email != '' 
    AND NOT is_valid_email(email)
  LOOP
    invalid_count := invalid_count + 1;
    
    -- Try to fix common issues
    -- Missing @ symbol (example: johndoegmail.com -> john.doe@gmail.com)
    IF rec.email NOT LIKE '%@%' AND rec.email LIKE '%gmail.com' THEN
      INSERT INTO invalid_emails VALUES (
        rec.id, 
        rec.email, 
        REPLACE(rec.email, 'gmail.com', '@gmail.com')
      );
      fixed_count := fixed_count + 1;
    -- Other common domains
    ELSIF rec.email NOT LIKE '%@%' AND rec.email LIKE '%yahoo.com' THEN
      INSERT INTO invalid_emails VALUES (
        rec.id, 
        rec.email, 
        REPLACE(rec.email, 'yahoo.com', '@yahoo.com')
      );
      fixed_count := fixed_count + 1;
    ELSIF rec.email NOT LIKE '%@%' AND rec.email LIKE '%hotmail.com' THEN
      INSERT INTO invalid_emails VALUES (
        rec.id, 
        rec.email, 
        REPLACE(rec.email, 'hotmail.com', '@hotmail.com')
      );
      fixed_count := fixed_count + 1;
    ELSE
      -- Can't automatically fix
      INSERT INTO invalid_emails VALUES (
        rec.id, 
        rec.email, 
        NULL
      );
    END IF;
  END LOOP;
  
  -- Report findings
  RAISE NOTICE 'Found % invalid email(s), with % potential automatic fixes', invalid_count, fixed_count;
  
  -- Show the invalid emails and suggested fixes
  RAISE NOTICE 'Invalid emails:';
  FOR rec IN SELECT * FROM invalid_emails ORDER BY id LOOP
    IF rec.suggested_fix IS NOT NULL THEN
      RAISE NOTICE 'ID: %, Invalid: %, Suggested fix: %', rec.id, rec.original_email, rec.suggested_fix;
    ELSE
      RAISE NOTICE 'ID: %, Invalid: %, No automatic fix available', rec.id, rec.original_email;
    END IF;
  END LOOP;
  
  -- Apply automatic fixes if available (uncomment to apply)
  -- UPDATE individuals i
  -- SET email = ie.suggested_fix
  -- FROM invalid_emails ie
  -- WHERE i.id = ie.id
  -- AND ie.suggested_fix IS NOT NULL;
  
  -- Drop the temporary table
  DROP TABLE invalid_emails;
END $$;

-- 3. Add a trigger to validate emails on insert/update
CREATE OR REPLACE FUNCTION validate_email_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Only validate if email is provided
  IF NEW.email IS NOT NULL AND NEW.email != '' THEN
    IF NOT is_valid_email(NEW.email) THEN
      RAISE EXCEPTION 'Invalid email format: %', NEW.email;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger on individuals table
DROP TRIGGER IF EXISTS validate_email_trigger ON individuals;
CREATE TRIGGER validate_email_trigger
BEFORE INSERT OR UPDATE ON individuals
FOR EACH ROW
EXECUTE FUNCTION validate_email_trigger();

-- 4. Add a similar trigger to the profiles table
DROP TRIGGER IF EXISTS validate_profile_email_trigger ON profiles;
CREATE TRIGGER validate_profile_email_trigger
BEFORE INSERT OR UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION validate_email_trigger();

-- 5. Create a function to fix common email issues
CREATE OR REPLACE FUNCTION fix_common_email_issues(email_to_fix TEXT)
RETURNS TEXT AS $$
DECLARE
  fixed_email TEXT;
BEGIN
  -- Replace common issues
  fixed_email := email_to_fix;
  
  -- Missing @ symbol (replace last occurrence of 'gmail.com', 'yahoo.com', etc.)
  IF fixed_email NOT LIKE '%@%' THEN
    -- Check for common domains without @
    IF fixed_email LIKE '%gmail.com' THEN
      fixed_email := regexp_replace(fixed_email, 'gmail\.com$', '@gmail.com');
    ELSIF fixed_email LIKE '%yahoo.com' THEN
      fixed_email := regexp_replace(fixed_email, 'yahoo\.com$', '@yahoo.com');
    ELSIF fixed_email LIKE '%hotmail.com' THEN
      fixed_email := regexp_replace(fixed_email, 'hotmail\.com$', '@hotmail.com');
    ELSIF fixed_email LIKE '%outlook.com' THEN
      fixed_email := regexp_replace(fixed_email, 'outlook\.com$', '@outlook.com');
    END IF;
  END IF;
  
  -- If still no @ symbol and there's a dot, try to insert @ before the last dot
  IF fixed_email NOT LIKE '%@%' AND fixed_email LIKE '%.%' THEN
    fixed_email := regexp_replace(fixed_email, '\.([^\.]+)$', '@\1');
  END IF;
  
  -- Return the fixed email if it's now valid, otherwise return the original
  IF is_valid_email(fixed_email) THEN
    RETURN fixed_email;
  ELSE
    RETURN email_to_fix;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 6. Create an admin function to fix invalid emails
-- Function to attempt to fix all invalid emails
CREATE OR REPLACE FUNCTION fix_invalid_emails()
RETURNS TABLE (
  id UUID,
  original_email TEXT,
  fixed_email TEXT,
  success BOOLEAN
) AS $$
DECLARE
  invalid_email RECORD;
  fixed TEXT;
BEGIN
  FOR invalid_email IN 
    SELECT i.id, i.email
    FROM individuals i
    WHERE i.email IS NOT NULL 
      AND i.email != '' 
      AND NOT is_valid_email(i.email)
  LOOP
    fixed := fix_common_email_issues(invalid_email.email);
    
    -- If the email was fixed successfully
    IF is_valid_email(fixed) AND fixed != invalid_email.email THEN
      -- Update the email in the database
      UPDATE individuals 
      SET email = fixed
      WHERE id = invalid_email.id;
      
      id := invalid_email.id;
      original_email := invalid_email.email;
      fixed_email := fixed;
      success := TRUE;
      RETURN NEXT;
    ELSE
      id := invalid_email.id;
      original_email := invalid_email.email;
      fixed_email := NULL;
      success := FALSE;
      RETURN NEXT;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- 7. Create a function to get all invalid emails (for admin dashboard)
CREATE OR REPLACE FUNCTION get_invalid_emails()
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT i.id, i.name, i.email
  FROM individuals i
  WHERE i.email IS NOT NULL 
    AND i.email != '' 
    AND NOT is_valid_email(i.email);
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_invalid_emails() TO authenticated;
