-- Add internal_tester column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS internal_tester BOOLEAN DEFAULT FALSE;

-- Add new feature flags for version control
INSERT INTO public.feature_flags (key, enabled, description)
VALUES 
  ('version_ui_ro', FALSE, 'Enables read-only access to the versioning UI for internal testers'),
  ('version_upload_beta', FALSE, 'Enables the beta feature for uploading new versions for internal testers')
ON CONFLICT (key) DO NOTHING;
