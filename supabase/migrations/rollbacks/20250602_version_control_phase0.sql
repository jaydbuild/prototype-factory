-- Rollback for Version Control Phase 0
-- Drop function
DROP FUNCTION IF EXISTS create_version_row;

-- Drop table (will cascade delete all data)
DROP TABLE IF EXISTS public.prototype_versions;

-- Remove feature flag
DELETE FROM public.feature_flags 
WHERE key = 'version_control_enabled';
