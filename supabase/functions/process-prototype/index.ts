
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-prototype-id, x-file-name',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get metadata from headers
    const prototypeId = req.headers.get('x-prototype-id');
    const fileName = req.headers.get('x-file-name');

    if (!prototypeId || !fileName) {
      return new Response(
        JSON.stringify({ error: 'Missing required headers' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Get the file from the form data
    const formData = await req.formData()
    const file = formData.get('file')

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file uploaded' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Upload the file with proper content type
    const { error: uploadError } = await supabase.storage
      .from('prototype-deployments')
      .upload(`${prototypeId}/${fileName}`, file, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: true
      })

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to upload file', details: uploadError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Update prototype status
    const { error: updateError } = await supabase
      .from('prototypes')
      .update({
        deployment_status: 'deployed',
        processed_at: new Date().toISOString()
      })
      .eq('id', prototypeId)

    if (updateError) {
      console.error('Update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update prototype status', details: updateError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('Process error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
