-- Add phone verification fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verification_code VARCHAR(6),
ADD COLUMN IF NOT EXISTS verification_code_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS individual_id UUID REFERENCES individuals(id);

-- Update role enum to include supporter
ALTER TABLE profiles 
ALTER COLUMN role TYPE TEXT;

-- Add check constraint for roles
ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'user', 'supporter'));

-- Create index for phone verification lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone_number ON profiles(phone_number);
CREATE INDEX IF NOT EXISTS idx_profiles_verification_code ON profiles(verification_code);

-- Create RLS policies for supporters
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile" ON profiles
FOR SELECT USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE USING (auth.uid() = id);

-- Policy: Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON profiles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'user')
  )
);

-- Policy: Admins can update all profiles
CREATE POLICY "Admins can update all profiles" ON profiles
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'user')
  )
);

-- RLS for individuals table
ALTER TABLE individuals ENABLE ROW LEVEL SECURITY;

-- Policy: Supporters can only view their own individual record
CREATE POLICY "Supporters can view own individual" ON individuals
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND individual_id = individuals.id
    AND role = 'supporter'
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'user')
  )
);

-- Policy: Supporters can update their own individual record
CREATE POLICY "Supporters can update own individual" ON individuals
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND individual_id = individuals.id
    AND role = 'supporter'
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'user')
  )
);

-- RLS for pledges table
ALTER TABLE pledges ENABLE ROW LEVEL SECURITY;

-- Policy: Supporters can only view their own pledges
CREATE POLICY "Supporters can view own pledges" ON pledges
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND individual_id = pledges.individual_id
    AND role = 'supporter'
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'user')
  )
);

-- Policy: Supporters can insert their own pledges
CREATE POLICY "Supporters can insert own pledges" ON pledges
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND individual_id = pledges.individual_id
    AND role = 'supporter'
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'user')
  )
);

-- Policy: Supporters can update their own pledges
CREATE POLICY "Supporters can update own pledges" ON pledges
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND individual_id = pledges.individual_id
    AND role = 'supporter'
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'user')
  )
);
