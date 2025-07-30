-- This migration ensures that all required columns exist on the profiles table.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_url text;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS internal_tester boolean DEFAULT false;
