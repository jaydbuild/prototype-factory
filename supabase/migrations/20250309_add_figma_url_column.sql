-- Add figma_url column to prototypes table
ALTER TABLE prototypes ADD COLUMN IF NOT EXISTS figma_url TEXT;
