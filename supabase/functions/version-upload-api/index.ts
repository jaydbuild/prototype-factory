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
    console.log("Version upload API function called");
    
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

    // No feature flag or internal tester checks anymore - accessible to all users who own the prototype

    // Process form data
    const formData = await req.formData();
    const prototypeId = formData.get('prototypeId')?.toString();
    const file = formData.get('file') as File;
    const title = formData.get('title')?.toString();
    const description = formData.get('description')?.toString();
    const figmaUrl = formData.get('figmaUrl')?.toString();
    
    if (!prototypeId || !file) {
      throw new Error('Missing required parameters: prototypeId and file');
    }
    
    // Verify the user has access to this prototype
    const { data: prototype, error: prototypeError } = await supabase
      .from('prototypes')
      .select('id, created_by')
      .eq('id', prototypeId)
      .single();
    
    if (prototypeError || !prototype) {
      throw new Error('Prototype not found');
    }
    
    // Check if user owns this prototype or has admin access
    if (prototype.created_by !== user.id) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
        
      if (profileError || profile?.role !== 'admin') {
        throw new Error('You do not have permission to update this prototype');
      }
    }
    
    // Create version record with processing status
    const { data: versionId, error: versionError } = await supabase.rpc('create_version_row', {
      p_prototype_id: prototypeId,
      p_created_by: user.id,
      p_status: 'processing'
    });
    
    if (versionError) {
      throw new Error(`Error creating version record: ${versionError.message}`);
    }
    
    // Update version with additional metadata if provided
    if (title || description || figmaUrl) {
      await supabase
        .from('prototype_versions')
        .update({ 
          title: title || null,
          description: description || null,
          figma_url: figmaUrl || null
        })
        .eq('id', versionId);
    }
    
    // Upload file to storage
    const versionFileName = `${prototypeId}-version-${Date.now()}.zip`;
    const { error: uploadError } = await supabase.storage
      .from('prototype-uploads')
      .upload(`${prototypeId}/${versionFileName}`, file);
      
    if (uploadError) {
      throw new Error(`Error uploading file: ${uploadError.message}`);
    }
    
    // Trigger processing function asynchronously
    const processFunctionUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/process-version-upload`;
    fetch(processFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      },
      body: JSON.stringify({
        prototypeId,
        versionId,
        fileName: versionFileName
      })
    }).catch(err => console.error('Error triggering process function:', err));
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Version upload started', 
        versionId 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error in version-upload-api:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 400 
      }
    );
  }
});
