
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { extractFigmaFileKey } from '../figma-utils.ts'

interface RequestBody {
  prototypeId: string;
  figmaUrl: string;
}

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Create a Supabase client with the Auth context of the function
    const supabaseClient = createClient(
      // Supabase API URL - env var exposed by default when deployed
      Deno.env.get('SUPABASE_URL') ?? '',
      // Supabase API ANON KEY - env var exposed by default when deployed
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Get the request body
    const { prototypeId, figmaUrl } = await req.json() as RequestBody;

    if (!prototypeId || !figmaUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }
    
    // Validate the Figma URL
    const { fileKey, error: urlError } = extractFigmaFileKey(figmaUrl);
    
    if (urlError || !fileKey) {
      return new Response(
        JSON.stringify({ error: urlError || 'Invalid Figma URL' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Update the prototype with the Figma URL
    const { error: updateError } = await supabaseClient
      .from('prototypes')
      .update({ figma_url: figmaUrl })
      .eq('id', prototypeId);
      
    if (updateError) {
      console.error('Error updating prototype:', updateError);
      throw new Error(`Failed to update prototype: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        fileKey
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error processing request:', errorMessage);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
