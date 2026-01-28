-- Create initial admin user profile
-- This assumes you have already created a user through Supabase Auth
-- Replace 'your-admin-email@example.com' with your actual admin email

-- First, let's create a function to safely create an admin profile
CREATE OR REPLACE FUNCTION create_admin_profile(
  admin_email TEXT,
  admin_name TEXT DEFAULT 'System Administrator'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id UUID;
  result_message TEXT;
BEGIN
  -- Try to find the user ID from auth.users
  SELECT id INTO user_id 
  FROM auth.users 
  WHERE email = admin_email 
  LIMIT 1;
  
  IF user_id IS NULL THEN
    RETURN 'User with email ' || admin_email || ' not found in auth.users. Please create the user first through Supabase Auth.';
  END IF;
  
  -- Insert or update the profile
  INSERT INTO profiles (id, email, full_name, role, phone_verified)
  VALUES (user_id, admin_email, admin_name, 'admin', true)
  ON CONFLICT (id) 
  DO UPDATE SET 
    role = 'admin',
    phone_verified = true,
    email = admin_email,
    full_name = COALESCE(profiles.full_name, admin_name);
    
  result_message := 'Admin profile created/updated for ' || admin_email || ' with user ID: ' || user_id;
  RETURN result_message;
END;
$$;

-- Example usage (uncomment and replace with your admin email):
-- SELECT create_admin_profile('admin@acla.org', 'ACLA Administrator');

-- You can also manually insert if you know the user ID:
-- INSERT INTO profiles (id, email, full_name, role, phone_verified)
-- VALUES ('your-user-id-here', 'admin@acla.org', 'ACLA Administrator', 'admin', true)
-- ON CONFLICT (id) DO UPDATE SET role = 'admin', phone_verified = true;
