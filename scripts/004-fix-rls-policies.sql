-- Drop existing policies that might be too restrictive
DROP POLICY IF EXISTS "Users can view own individual" ON individuals;
DROP POLICY IF EXISTS "Users can update own individual" ON individuals;
DROP POLICY IF EXISTS "Admins can manage all individuals" ON individuals;

-- Create more permissive policies for individuals table
CREATE POLICY "Enable read access for authenticated users" ON individuals
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON individuals
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own individual" ON individuals
    FOR UPDATE USING (
        auth.uid()::text IN (
            SELECT id FROM profiles WHERE individual_id = individuals.id
        )
    );

CREATE POLICY "Admins can manage all individuals" ON individuals
    FOR ALL USING (
        auth.uid()::text IN (
            SELECT id FROM profiles WHERE role IN ('admin', 'user')
        )
    );

-- Update profiles policies to be more permissive during registration
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON profiles;

CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid()::text = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid()::text = id);

CREATE POLICY "Enable insert for authenticated users" ON profiles
    FOR INSERT WITH CHECK (auth.uid()::text = id OR auth.role() = 'service_role');

CREATE POLICY "Admins can manage all profiles" ON profiles
    FOR ALL USING (
        auth.uid()::text IN (
            SELECT id FROM profiles WHERE role IN ('admin', 'user')
        )
    );

-- Update pledges policies to allow supporters to manage their own pledges
DROP POLICY IF EXISTS "Users can view own pledges" ON pledges;
DROP POLICY IF EXISTS "Users can insert own pledges" ON pledges;
DROP POLICY IF EXISTS "Admins can manage all pledges" ON pledges;

CREATE POLICY "Users can view own pledges" ON pledges
    FOR SELECT USING (
        auth.uid()::text IN (
            SELECT id FROM profiles WHERE individual_id = pledges.individual_id
        ) OR
        auth.uid()::text IN (
            SELECT id FROM profiles WHERE role IN ('admin', 'user')
        )
    );

CREATE POLICY "Users can insert own pledges" ON pledges
    FOR INSERT WITH CHECK (
        auth.uid()::text IN (
            SELECT id FROM profiles WHERE individual_id = pledges.individual_id
        ) OR
        auth.uid()::text IN (
            SELECT id FROM profiles WHERE role IN ('admin', 'user')
        )
    );

CREATE POLICY "Users can update own pledges" ON pledges
    FOR UPDATE USING (
        auth.uid()::text IN (
            SELECT id FROM profiles WHERE individual_id = pledges.individual_id
        ) OR
        auth.uid()::text IN (
            SELECT id FROM profiles WHERE role IN ('admin', 'user')
        )
    );

CREATE POLICY "Admins can manage all pledges" ON pledges
    FOR ALL USING (
        auth.uid()::text IN (
            SELECT id FROM profiles WHERE role IN ('admin', 'user')
        )
    );
