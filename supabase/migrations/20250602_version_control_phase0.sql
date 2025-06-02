-- Version Control Phase 0: Groundwork
-- Create prototype_versions table
CREATE TABLE public.prototype_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prototype_id UUID NOT NULL REFERENCES public.prototypes(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ready', -- ready / processing / failed
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  
  -- Constraints
  UNIQUE (prototype_id, version_number)
);

-- Create index for efficient querying by prototype and status
CREATE INDEX idx_prototype_versions_prototype_status
  ON public.prototype_versions (prototype_id, status);

-- Create transaction-safe function for creating version rows
CREATE OR REPLACE FUNCTION create_version_row(
  p_prototype_id UUID,
  p_created_by UUID,
  p_status VARCHAR DEFAULT 'ready'
) RETURNS UUID AS $$
DECLARE
  next_version INT;
  version_id UUID;
BEGIN
  -- Lock the prototype row to prevent race conditions
  PERFORM pg_advisory_xact_lock(hashtext('prototype_version_' || p_prototype_id::text));
  
  -- Get next version atomically
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO next_version
  FROM prototype_versions
  WHERE prototype_id = p_prototype_id;
  
  -- Create version record
  INSERT INTO prototype_versions (
    prototype_id, 
    version_number,
    status,
    created_by
  ) VALUES (
    p_prototype_id,
    next_version,
    p_status,
    p_created_by
  ) RETURNING id INTO version_id;
  
  RETURN version_id;
END;
$$ LANGUAGE plpgsql;

-- Migrate existing prototypes to v1
DO $$
DECLARE
  prototype_record RECORD;
BEGIN
  FOR prototype_record IN 
    SELECT 
      id, 
      created_by, 
      created_at
    FROM 
      public.prototypes
    WHERE 
      preview_url IS NOT NULL 
      OR files_url IS NOT NULL
  LOOP
    INSERT INTO prototype_versions (
      prototype_id,
      version_number,
      status,
      created_by,
      created_at
    ) VALUES (
      prototype_record.id,
      1,
      'ready',
      prototype_record.created_by,
      prototype_record.created_at
    );
  END LOOP;
END $$;

-- Create feature flag if it doesn't exist
INSERT INTO public.feature_flags (key, enabled, description)
VALUES (
  'version_control_enabled', 
  FALSE, 
  'Enables version control features for prototypes'
)
ON CONFLICT (key) DO NOTHING;
