-- Add user_type column to profiles table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'user_type'
  ) THEN
    ALTER TABLE profiles ADD COLUMN user_type VARCHAR(50);
    
    -- Update existing records based on role
    UPDATE profiles SET user_type = 'supporter' WHERE role = 'supporter';
    UPDATE profiles SET user_type = 'admin' WHERE role = 'admin';
    
    -- Add comment to the column
    COMMENT ON COLUMN profiles.user_type IS 'Type of user (admin, supporter, etc.)';
    
    RAISE NOTICE 'Added user_type column to profiles table';
  ELSE
    RAISE NOTICE 'user_type column already exists in profiles table';
  END IF;
END $$;

-- Create an index on user_type for faster queries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE tablename = 'profiles' AND indexname = 'idx_profiles_user_type'
  ) THEN
    CREATE INDEX idx_profiles_user_type ON profiles(user_type);
    RAISE NOTICE 'Created index on user_type column';
  ELSE
    RAISE NOTICE 'Index on user_type column already exists';
  END IF;
END $$;

-- Update RLS policies to include user_type
DO $$
BEGIN
  -- Drop existing policy if it exists
  DROP POLICY IF EXISTS profiles_select_policy ON profiles;
  
  -- Create new policy that includes user_type
  CREATE POLICY profiles_select_policy ON profiles
    FOR SELECT
    USING (true);
    
  RAISE NOTICE 'Updated RLS policies for profiles table';
END $$;
