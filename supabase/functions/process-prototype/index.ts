
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { JSZip } from "https://deno.land/x/jszip@0.11.0/mod.ts";
import { ensureDir } from "https://deno.land/std@0.216.0/fs/ensure_dir.ts";
import { join } from "https://deno.land/std@0.216.0/path/mod.ts";

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
    console.log('Starting prototype processing...');

    // Get metadata from headers
    const prototypeId = req.headers.get('x-prototype-id');
    const fileName = req.headers.get('x-file-name');

    if (!prototypeId || !fileName) {
      console.error('Missing required headers:', { prototypeId, fileName });
      return new Response(
        JSON.stringify({ error: 'Missing required headers' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Get the file from the form data
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      console.error('No valid file uploaded');
      return new Response(
        JSON.stringify({ error: 'No valid file uploaded' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('Processing file:', { fileName: file.name, type: file.type, size: file.size });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Update status to processing
    await supabase
      .from('prototypes')
      .update({ deployment_status: 'processing' })
      .eq('id', prototypeId);

    // Process based on file type
    if (file.type === 'application/zip') {
      console.log('Processing ZIP file...');
      
      // Read the ZIP file
      const arrayBuffer = await file.arrayBuffer();
      const zip = new JSZip();
      
      try {
        await zip.loadAsync(arrayBuffer);
      } catch (error) {
        console.error('Failed to load ZIP file:', error);
        throw new Error('Invalid ZIP file');
      }

      // Find index.html in the ZIP
      let indexHtmlEntry = null;
      let indexHtmlPath = '';

      for (const [path, entry] of Object.entries(zip.files)) {
        if (path.endsWith('index.html')) {
          indexHtmlEntry = entry;
          indexHtmlPath = path;
          break;
        }
      }

      if (!indexHtmlEntry) {
        throw new Error('No index.html found in ZIP file');
      }

      console.log('Found index.html at:', indexHtmlPath);

      // Extract all files
      for (const [path, entry] of Object.entries(zip.files)) {
        if (!entry.dir) {
          const content = await entry.async('uint8array');
          const relativePath = path.replace(/^[^/]+\//, '');
          const fullPath = `${prototypeId}/${relativePath}`;
          
          console.log('Uploading file:', fullPath);
          
          const { error: uploadError } = await supabase.storage
            .from('prototype-deployments')
            .upload(fullPath, content, {
              contentType: entry.name.endsWith('.html') ? 'text/html' :
                          entry.name.endsWith('.css') ? 'text/css' :
                          entry.name.endsWith('.js') ? 'application/javascript' :
                          'application/octet-stream',
              upsert: true
            });

          if (uploadError) {
            console.error('Upload error for file:', fullPath, uploadError);
            throw uploadError;
          }
        }
      }
    } else {
      // Handle single file upload
      console.log('Processing single file...');
      
      const { error: uploadError } = await supabase.storage
        .from('prototype-deployments')
        .upload(`${prototypeId}/index.html`, file, {
          contentType: 'text/html',
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }
    }

    // Get the URL for the deployed prototype
    const { data: urlData } = await supabase.storage
      .from('prototype-deployments')
      .createSignedUrl(`${prototypeId}/index.html`, 3600);

    // Update prototype status and URL
    const { error: updateError } = await supabase
      .from('prototypes')
      .update({
        deployment_status: 'deployed',
        processed_at: new Date().toISOString(),
        deployment_url: urlData?.signedUrl || null
      })
      .eq('id', prototypeId);

    if (updateError) {
      console.error('Error updating prototype:', updateError);
      throw updateError;
    }

    console.log('Prototype processing completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Prototype processed successfully',
        url: urlData?.signedUrl 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Process error:', error);
    
    // Update prototype status to failed
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await supabase
      .from('prototypes')
      .update({ 
        deployment_status: 'failed',
        processed_at: new Date().toISOString()
      })
      .eq('id', req.headers.get('x-prototype-id'));

    return new Response(
      JSON.stringify({ 
        error: 'An unexpected error occurred', 
        details: error.message,
        stack: error.stack 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
