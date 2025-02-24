-- Add new columns for prototype state management
ALTER TABLE prototypes
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS deployment_url text,
ADD COLUMN IF NOT EXISTS processed_at timestamptz,
ADD COLUMN IF NOT EXISTS bundle_path text,
ADD COLUMN IF NOT EXISTS sandbox_config jsonb DEFAULT '{"permissions": ["allow-scripts", "allow-same-origin"]}'::jsonb;

-- Add indices for frequently accessed columns
CREATE INDEX IF NOT EXISTS idx_prototypes_status ON prototypes(status);
CREATE INDEX IF NOT EXISTS idx_prototypes_processed_at ON prototypes(processed_at);

-- Add constraints
ALTER TABLE prototypes
ADD CONSTRAINT check_status CHECK (status IN ('pending', 'processing', 'processed', 'failed'));
