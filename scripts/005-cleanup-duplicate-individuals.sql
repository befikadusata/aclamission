-- Clean up duplicate individuals and ensure proper linking

-- First, let's identify duplicates by email
WITH duplicate_individuals AS (
  SELECT 
    email,
    COUNT(*) as count,
    MIN(id) as keep_id,
    ARRAY_AGG(id ORDER BY created_at) as all_ids
  FROM individuals 
  WHERE email IS NOT NULL 
  GROUP BY email 
  HAVING COUNT(*) > 1
),
-- Get the IDs to delete (all except the first one)
individuals_to_delete AS (
  SELECT 
    UNNEST(all_ids[2:]) as delete_id,
    keep_id,
    email
  FROM duplicate_individuals
)
-- Update pledges to point to the kept individual before deleting
UPDATE pledges 
SET individual_id = (
  SELECT keep_id 
  FROM individuals_to_delete 
  WHERE delete_id = pledges.individual_id
)
WHERE individual_id IN (
  SELECT delete_id FROM individuals_to_delete
);

-- Delete duplicate individuals
WITH duplicate_individuals AS (
  SELECT 
    email,
    COUNT(*) as count,
    MIN(id) as keep_id,
    ARRAY_AGG(id ORDER BY created_at) as all_ids
  FROM individuals 
  WHERE email IS NOT NULL 
  GROUP BY email 
  HAVING COUNT(*) > 1
),
individuals_to_delete AS (
  SELECT 
    UNNEST(all_ids[2:]) as delete_id
  FROM duplicate_individuals
)
DELETE FROM individuals 
WHERE id IN (
  SELECT delete_id FROM individuals_to_delete
);

-- Update user metadata to point to the correct individual_id
-- This will be handled by the application code when users log in
