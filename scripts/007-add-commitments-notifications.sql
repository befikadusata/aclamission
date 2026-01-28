-- Create commitments table
CREATE TABLE IF NOT EXISTS public.commitments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pledge_id UUID NOT NULL REFERENCES public.pledges(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    bank TEXT NOT NULL,
    transaction_number TEXT,
    receipt_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    related_id TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    for_admins BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for commitments
ALTER TABLE public.commitments ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own commitments
CREATE POLICY "Users can view their own commitments" 
ON public.commitments FOR SELECT 
USING (auth.uid() = user_id);

-- Allow users to insert their own commitments
CREATE POLICY "Users can insert their own commitments" 
ON public.commitments FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow admins to view all commitments
CREATE POLICY "Admins can view all commitments" 
ON public.commitments FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Allow admins to update all commitments
CREATE POLICY "Admins can update all commitments" 
ON public.commitments FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Add RLS policies for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Allow users to view their notifications (non-admin notifications)
CREATE POLICY "Users can view their notifications" 
ON public.notifications FOR SELECT 
USING (
  NOT for_admins OR 
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Allow users to update their notifications (mark as read)
CREATE POLICY "Users can update their notifications" 
ON public.notifications FOR UPDATE 
USING (
  NOT for_admins OR 
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Allow admins to insert notifications
CREATE POLICY "Admins can insert notifications" 
ON public.notifications FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Allow authenticated users to insert notifications
CREATE POLICY "Authenticated users can insert notifications" 
ON public.notifications FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');
