-- Add email verification columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_verification_token TEXT,
ADD COLUMN IF NOT EXISTS email_verification_expires_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email_verification_token 
ON profiles(email_verification_token) 
WHERE email_verification_token IS NOT NULL;
