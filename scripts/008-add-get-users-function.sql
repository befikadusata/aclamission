-- Create a function to get users from auth.users
CREATE OR REPLACE FUNCTION public.get_users()
RETURNS TABLE (
  id uuid,
  email text,
  role text,
  created_at timestamptz,
  email_confirmed_at timestamptz
) 
SECURITY DEFINER
AS $$
BEGIN
  -- Only allow admins to access this function
  IF (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' THEN
    RETURN QUERY
    SELECT 
      au.id,
      au.email,
      COALESCE(p.role, 'supporter') as role,
      au.created_at,
      au.email_confirmed_at
    FROM auth.users au
    LEFT JOIN public.profiles p ON au.id = p.id;
  ELSE
    -- Return empty set for non-admins
    RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::text, NULL::timestamptz, NULL::timestamptz WHERE false;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_users() TO authenticated;
