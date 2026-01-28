-- Ensure profiles table has proper constraints and defaults
ALTER TABLE profiles 
ALTER COLUMN email SET NOT NULL,
ALTER COLUMN role SET DEFAULT 'user',
ALTER COLUMN phone_verified SET DEFAULT false;

-- Add unique constraint on email if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'profiles_email_key' 
        AND table_name = 'profiles'
    ) THEN
        ALTER TABLE profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);
    END IF;
END $$;

-- Ensure no duplicate profiles exist
DELETE FROM profiles a USING profiles b 
WHERE a.id = b.id AND a.ctid < b.ctid;
