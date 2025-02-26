
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { JSZip } from "https://deno.land/x/jszip@0.11.0/mod.ts";

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
      throw new Error('Missing required headers');
    }

    // Get the file from the form data
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      throw new Error('No valid file uploaded');
    }

    console.log(`Processing file: ${fileName} (${file.size} bytes, ${file.type})`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Update status to processing
    await supabase
      .from('prototypes')
      .update({ deployment_status: 'processing' })
      .eq('id', prototypeId);

    if (file.type === 'application/zip' || fileName.endsWith('.zip')) {
      console.log('Processing ZIP file...');
      
      // Read the ZIP file
      const arrayBuffer = await file.arrayBuffer();
      const zip = new JSZip();
      
      await zip.loadAsync(arrayBuffer);

      // Find all HTML files and their paths
      const htmlFiles = Object.entries(zip.files).filter(([path, entry]) => 
        !entry.dir && (path.endsWith('.html') || path.endsWith('.htm'))
      );

      console.log(`Found ${htmlFiles.length} HTML files in ZIP`);

      if (htmlFiles.length === 0) {
        throw new Error('No HTML files found in ZIP');
      }

      // Find index.html or take the first HTML file
      let mainHtmlFile = htmlFiles.find(([path]) => 
        path.toLowerCase().endsWith('index.html') || 
        path.toLowerCase().endsWith('index.htm')
      );

      if (!mainHtmlFile) {
        console.log('No index.html found, using first HTML file');
        mainHtmlFile = htmlFiles[0];
      }

      // Extract all files, maintaining directory structure
      for (const [path, entry] of Object.entries(zip.files)) {
        if (!entry.dir) {
          try {
            const content = await entry.async('uint8array');
            const deployPath = `${prototypeId}/${path}`;
            
            // Determine content type based on file extension
            const ext = path.split('.').pop()?.toLowerCase();
            const contentType = {
              'html': 'text/html',
              'htm': 'text/html',
              'css': 'text/css',
              'js': 'application/javascript',
              'json': 'application/json',
              'png': 'image/png',
              'jpg': 'image/jpeg',
              'jpeg': 'image/jpeg',
              'gif': 'image/gif',
              'svg': 'image/svg+xml',
              'ico': 'image/x-icon',
            }[ext || ''] || 'application/octet-stream';

            console.log(`Uploading ${path} as ${contentType}`);

            const { error: uploadError } = await supabase.storage
              .from('prototype-deployments')
              .upload(deployPath, content, {
                contentType,
                upsert: true
              });

            if (uploadError) {
              console.error(`Error uploading ${path}:`, uploadError);
              throw uploadError;
            }
          } catch (error) {
            console.error(`Failed to process ${path}:`, error);
            throw error;
          }
        }
      }

      // If we found an index.html, ensure it's also at the root
      if (mainHtmlFile) {
        const [originalPath, entry] = mainHtmlFile;
        const content = await entry.async('uint8array');
        
        // Also place a copy at the root as index.html
        await supabase.storage
          .from('prototype-deployments')
          .upload(`${prototypeId}/index.html`, content, {
            contentType: 'text/html',
            upsert: true
          });
      }
    } else if (file.type === 'text/html' || fileName.endsWith('.html') || fileName.endsWith('.htm')) {
      // Single HTML file upload
      console.log('Processing single HTML file...');
      
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
    } else {
      throw new Error('Unsupported file type. Please upload an HTML file or ZIP archive.');
    }

    // Get the URL for the deployed prototype
    const { data: urlData } = await supabase.storage
      .from('prototype-deployments')
      .createSignedUrl(`${prototypeId}/index.html`, 3600);

    // Update prototype status and URL
    await supabase
      .from('prototypes')
      .update({
        deployment_status: 'deployed',
        processed_at: new Date().toISOString(),
        deployment_url: urlData?.signedUrl || null
      })
      .eq('id', prototypeId);

    console.log('Prototype processing completed successfully');

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Processing error:', error);

    // Create a new supabase client for error handling
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Update prototype status to failed
    if (req.headers.get('x-prototype-id')) {
      await supabase
        .from('prototypes')
        .update({
          deployment_status: 'failed',
          processed_at: new Date().toISOString()
        })
        .eq('id', req.headers.get('x-prototype-id'));
    }

    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred',
        details: error.stack
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
