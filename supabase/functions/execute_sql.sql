-- Function to execute arbitrary SQL (with proper permissions)
CREATE OR REPLACE FUNCTION public.execute_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;
