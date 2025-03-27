
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://lilukmlnbrzyjrksteay.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpbHVrbWxuYnJ6eWpya3N0ZWF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg2NTIwMzAsImV4cCI6MjA1NDIyODAzMH0.HP3oMkQ8RFFzRiklzOBrxcQ-PzX9HTlICqC5FkHNR6M";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: typeof window !== 'undefined' ? localStorage : undefined
  }
});
