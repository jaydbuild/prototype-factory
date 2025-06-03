import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS preflight request handling
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Demo endpoint called");
    
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    // Check if user has permission
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('internal_tester')
      .eq('id', user.id)
      .single();
      
    if (profileError) {
      throw new Error('Error fetching user profile');
    }
    
    const isInternalTester = !!profiles?.internal_tester;
    
    // Check feature flags
    const { data: flags, error: flagError } = await supabase
      .from('feature_flags')
      .select('key, enabled')
      .in('key', ['version_control_enabled', 'version_demo_ops']);
      
    if (flagError) {
      throw new Error('Error fetching feature flags');
    }
    
    const flagMap = flags?.reduce((acc, flag) => {
      acc[flag.key] = flag.enabled;
      return acc;
    }, {} as Record<string, boolean>) || {};
    
    if (!isInternalTester || !flagMap.version_demo_ops || !flagMap.version_control_enabled) {
      throw new Error('Unauthorized: Demo operations not enabled for this user');
    }

    // Parse URL to determine operation
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    
    // Handle revert operation
    if (pathParts.includes('revert') && req.method === 'POST') {
      const versionId = pathParts[pathParts.indexOf('prototype_versions') + 1];
      
      if (!versionId) {
        throw new Error('Missing version ID in path');
      }
      
      console.log(`Demo revert operation for version ${versionId}`);
      
      // For Phase 2-Lite, we're just returning success without actual implementation
      return new Response(
        JSON.stringify({ ok: true, operation: 'revert', versionId }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 200 
        }
      );
    }
    
    // Handle delete operation
    if (req.method === 'DELETE') {
      const versionId = pathParts[pathParts.indexOf('prototype_versions') + 1];
      
      if (!versionId) {
        throw new Error('Missing version ID in path');
      }
      
      console.log(`Demo delete operation for version ${versionId}`);
      
      // For Phase 2-Lite, we're just returning success without actual implementation
      return new Response(
        JSON.stringify({ ok: true, operation: 'delete', versionId }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 200 
        }
      );
    }
    
    // If we get here, the endpoint wasn't matched
    throw new Error('Invalid endpoint or method');
  } catch (error) {
    console.error('Error in demo endpoint:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 400 
      }
    );
  }
});
