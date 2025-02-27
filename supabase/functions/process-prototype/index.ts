
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { JSZip } from "https://deno.land/x/zipjs@v2.7.45/index.js";

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
    // Parse the request body as JSON
    const { prototypeId, fileName } = await req.json();
    
    console.log(`Processing prototype: ${prototypeId}, file: ${fileName}`);

    if (!prototypeId || !fileName) {
      throw new Error('Missing required parameters: prototypeId and fileName');
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Update prototype status to processing
    await supabase
      .from('prototypes')
      .update({ 
        deployment_status: 'processing',
        status: 'processing'
      })
      .eq('id', prototypeId);

    // Get the uploaded file from storage
    const { data: fileData, error: fileError } = await supabase.storage
      .from('prototype-uploads')
      .download(`${prototypeId}/${fileName}`);

    if (fileError) {
      console.error('Error downloading file:', fileError);
      throw new Error(`Failed to download file: ${fileError.message}`);
    }

    if (!fileData) {
      throw new Error('No file data received');
    }

    console.log(`File downloaded: ${fileData.size} bytes`);

    // Process based on file type
    if (fileName.endsWith('.zip')) {
      console.log('Processing ZIP file');
      const zip = new JSZip();
      
      try {
        await zip.loadAsync(fileData);
        console.log('ZIP loaded successfully');
        
        // Process all files in the ZIP
        const files = Object.keys(zip.files);
        console.log(`Found ${files.length} files in ZIP`);
        
        // Find HTML files
        const htmlFiles = files.filter(path => 
          !zip.files[path].dir && (path.endsWith('.html') || path.endsWith('.htm'))
        );
        
        console.log(`Found ${htmlFiles.length} HTML files`);
        
        if (htmlFiles.length === 0) {
          throw new Error('No HTML files found in the ZIP');
        }
        
        // Find index.html or first HTML file
        const indexFile = htmlFiles.find(path => 
          path.toLowerCase().includes('index.html') || path.toLowerCase().includes('index.htm')
        ) || htmlFiles[0];
        
        console.log(`Using ${indexFile} as the main HTML file`);
        
        // Process and upload all files
        for (const path of files) {
          const zipEntry = zip.files[path];
          
          if (!zipEntry.dir) {
            try {
              const fileContent = await zipEntry.async('uint8array');
              const uploadPath = `${prototypeId}/${path}`;
              
              // Determine content type
              let contentType = 'application/octet-stream';
              if (path.endsWith('.html') || path.endsWith('.htm')) contentType = 'text/html';
              else if (path.endsWith('.css')) contentType = 'text/css';
              else if (path.endsWith('.js')) contentType = 'application/javascript';
              else if (path.endsWith('.json')) contentType = 'application/json';
              else if (path.endsWith('.png')) contentType = 'image/png';
              else if (path.endsWith('.jpg') || path.endsWith('.jpeg')) contentType = 'image/jpeg';
              else if (path.endsWith('.gif')) contentType = 'image/gif';
              else if (path.endsWith('.svg')) contentType = 'image/svg+xml';
              
              console.log(`Uploading ${path} (${fileContent.length} bytes, ${contentType})`);
              
              const { error: uploadError } = await supabase.storage
                .from('prototype-deployments')
                .upload(uploadPath, fileContent, {
                  contentType,
                  upsert: true
                });
                
              if (uploadError) {
                console.error(`Error uploading ${path}:`, uploadError);
                // Continue with other files instead of throwing
                console.warn(`Skipping file ${path} due to upload error`);
              }
            } catch (uploadError) {
              console.error(`Error processing file ${path}:`, uploadError);
              // Continue with other files
              console.warn(`Skipping file ${path} due to processing error`);
            }
          }
        }
        
        // Ensure index.html exists at the root level
        const mainFileContent = await zip.files[indexFile].async('uint8array');
        const { error: mainFileError } = await supabase.storage
          .from('prototype-deployments')
          .upload(`${prototypeId}/index.html`, mainFileContent, {
            contentType: 'text/html',
            upsert: true
          });
          
        if (mainFileError) {
          console.error('Error uploading main HTML file:', mainFileError);
          throw new Error(`Failed to upload main HTML file: ${mainFileError.message}`);
        }
      } catch (zipError) {
        console.error('Error processing ZIP:', zipError);
        throw new Error(`Failed to process ZIP file: ${zipError.message}`);
      }
    } else if (fileName.endsWith('.html') || fileName.endsWith('.htm')) {
      console.log('Processing HTML file');
      
      // Upload directly as index.html
      const { error: uploadError } = await supabase.storage
        .from('prototype-deployments')
        .upload(`${prototypeId}/index.html`, fileData, {
          contentType: 'text/html',
          upsert: true
        });
        
      if (uploadError) {
        console.error('Error uploading HTML file:', uploadError);
        throw new Error(`Failed to upload HTML file: ${uploadError.message}`);
      }
    } else {
      throw new Error(`Unsupported file type: ${fileName}. Please upload an HTML file or ZIP archive.`);
    }
    
    // Get the deployment URL
    const { data: publicUrlData } = await supabase.storage
      .from('prototype-deployments')
      .getPublicUrl(`${prototypeId}/index.html`);
    
    const deploymentUrl = publicUrlData?.publicUrl;
    console.log(`Deployment URL: ${deploymentUrl}`);
    
    // Update prototype with status and URL
    await supabase
      .from('prototypes')
      .update({
        deployment_status: 'deployed',
        status: 'deployed',
        deployment_url: deploymentUrl,
        processed_at: new Date().toISOString()
      })
      .eq('id', prototypeId);
      
    console.log('Processing completed successfully');
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        deploymentUrl 
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error processing prototype:', error);
    
    try {
      // Try to update the prototype status to failed
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      // Get prototypeId from the request
      const reqBody = await req.json().catch(() => ({}));
      const prototypeId = reqBody.prototypeId;
      
      if (prototypeId) {
        await supabase
          .from('prototypes')
          .update({
            deployment_status: 'failed',
            status: 'failed',
            processed_at: new Date().toISOString()
          })
          .eq('id', prototypeId);
      }
    } catch (updateError) {
      console.error('Error updating prototype status:', updateError);
    }
    
    return new Response(
      JSON.stringify({
        error: error.message || 'An unknown error occurred',
        details: error.stack
      }),
      {
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
        status: 400
      }
    );
  }
});
