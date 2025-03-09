-- Function to check if a column exists in a table
CREATE OR REPLACE FUNCTION public.column_exists(table_name text, column_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  column_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = column_exists.table_name
    AND column_name = column_exists.column_name
  ) INTO column_exists;
  
  RETURN column_exists;
END;
$$;
