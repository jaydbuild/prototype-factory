
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { JSZip } from "https://deno.land/x/zipjs@v2.7.45/index.js";

// Update CORS headers to include all necessary headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-prototype-id, x-file-name',
}

serve(async (req) => {
  console.log('Process prototype function called');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Request content-type:', req.headers.get('content-type'));
    
    // Get the form data
    const formData = await req.formData();
    console.log('FormData parsed successfully');
    
    // Extract metadata from FormData instead of headers
    const prototypeId = formData.get('prototypeId');
    const fileName = formData.get('fileName');
    const file = formData.get('file');
    
    console.log('Extracted from FormData:', { 
      prototypeId: prototypeId, 
      fileName: fileName,
      hasFile: !!file,
      fileType: file instanceof File ? file.type : 'not a file'
    });

    // Validate required data
    if (!prototypeId || !fileName) {
      console.error('Missing required metadata:', { prototypeId, fileName });
      throw new Error('Missing required metadata: prototypeId and fileName are required');
    }

    if (!file || !(file instanceof File)) {
      console.error('No valid file uploaded');
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

    if (file.type === 'application/zip' || String(fileName).endsWith('.zip')) {
      console.log('Processing ZIP file...');
      
      // Read the ZIP file
      const arrayBuffer = await file.arrayBuffer();
      console.log(`ZIP file loaded: ${arrayBuffer.byteLength} bytes`);
      
      const zip = new JSZip();
      await zip.loadAsync(arrayBuffer);
      console.log('ZIP file parsed successfully');

      // Find all HTML files and their paths
      const htmlFiles = Object.entries(zip.files).filter(([path, entry]) => 
        !entry.dir && (path.endsWith('.html') || path.endsWith('.htm'))
      );

      console.log(`Found ${htmlFiles.length} HTML files in ZIP:`, 
        htmlFiles.map(([path]) => path).join(', ')
      );

      if (htmlFiles.length === 0) {
        throw new Error('No HTML files found in ZIP');
      }

      // Find index.html or take the first HTML file
      let mainHtmlFile = htmlFiles.find(([path]) => {
        const normalizedPath = path.toLowerCase();
        return normalizedPath.includes('index.html') || normalizedPath.includes('index.htm');
      });

      if (!mainHtmlFile) {
        console.log('No index.html found, using first HTML file');
        mainHtmlFile = htmlFiles[0];
      }
      
      console.log(`Using ${mainHtmlFile[0]} as main HTML file`);

      // Extract all files, maintaining directory structure
      let filesUploaded = 0;
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
            
            filesUploaded++;
          } catch (error) {
            console.error(`Failed to process ${path}:`, error);
            throw error;
          }
        }
      }
      console.log(`Uploaded ${filesUploaded} files from ZIP`);

      // If we found a main HTML file, ensure it's also at the root as index.html
      if (mainHtmlFile) {
        const [originalPath, entry] = mainHtmlFile;
        const content = await entry.async('uint8array');
        
        console.log(`Copying ${originalPath} to ${prototypeId}/index.html`);
        
        // Also place a copy at the root as index.html
        const { error: rootHtmlError } = await supabase.storage
          .from('prototype-deployments')
          .upload(`${prototypeId}/index.html`, content, {
            contentType: 'text/html',
            upsert: true
          });
          
        if (rootHtmlError) {
          console.error('Error creating root index.html:', rootHtmlError);
          throw rootHtmlError;
        }
      }
    } else if (file.type === 'text/html' || String(fileName).endsWith('.html') || String(fileName).endsWith('.htm')) {
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
      
      console.log('HTML file uploaded successfully');
    } else {
      console.error('Unsupported file type:', file.type);
      throw new Error(`Unsupported file type: ${file.type}. Please upload an HTML file or ZIP archive.`);
    }

    // Get the URL for the deployed prototype
    const { data: urlData, error: urlError } = await supabase.storage
      .from('prototype-deployments')
      .createSignedUrl(`${prototypeId}/index.html`, 3600);
      
    if (urlError) {
      console.error('Error creating signed URL:', urlError);
      throw urlError;
    }
    
    console.log('Created signed URL:', urlData?.signedUrl);

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
      console.error('Error updating prototype status:', updateError);
      throw updateError;
    }

    console.log('Prototype processing completed successfully');

    return new Response(
      JSON.stringify({ success: true, url: urlData?.signedUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Processing error:', error);

    try {
      // Create a new supabase client for error handling
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Try to get the prototype ID from formData
      const formData = await req.formData().catch(() => null);
      const prototypeId = formData?.get('prototypeId') || null;

      // Update prototype status to failed
      if (prototypeId) {
        console.log(`Updating prototype ${prototypeId} status to failed`);
        await supabase
          .from('prototypes')
          .update({
            deployment_status: 'failed',
            processed_at: new Date().toISOString()
          })
          .eq('id', prototypeId);
      } else {
        console.log('No prototype ID available for error handling');
      }
    } catch (secondaryError) {
      console.error('Error during error handling:', secondaryError);
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
