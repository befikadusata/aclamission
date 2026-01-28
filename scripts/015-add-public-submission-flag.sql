-- Add submission source field to pledges table
ALTER TABLE pledges ADD COLUMN IF NOT EXISTS submission_source TEXT DEFAULT 'admin_portal';

-- Add comment
COMMENT ON COLUMN pledges.submission_source IS 'Source of the pledge: admin_portal, public_link, supporter_portal';

-- Update existing pledges to have the default value
UPDATE pledges SET submission_source = 'admin_portal' WHERE submission_source IS NULL;
