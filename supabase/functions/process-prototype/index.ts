import { serve, createClient, unzip } from '../bundle-prototype/deps.ts';
import type { UnzippedFile } from "../types/prototypes.ts";
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts';
import { crypto } from 'https://deno.land/std@0.140.0/crypto/mod.ts';

// Type declarations
interface PrototypeRequest {
  prototypeId: string;
  fileName: string;
}

// Add logging for module verification
console.log("Module imports verified")

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Add request tracking
  const requestId = crypto.randomUUID();
  console.log(`[${requestId}] Processing new request`);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Validate environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error(`[${requestId}] Missing required environment variables`);
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { prototypeId, fileName } = await req.json() as PrototypeRequest;
    console.log(`[${requestId}] Processing prototype ${prototypeId} with file ${fileName}`);

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // First, verify the prototype exists and check its current state
    const { data: prototypeData, error: prototypeError } = await supabase
      .from('prototypes')
      .select('*')
      .eq('id', prototypeId)
      .single();

    if (prototypeError) {
      console.error(`[${requestId}] Database error: ${prototypeError.message}`);
      return new Response(
        JSON.stringify({ error: 'Failed to verify prototype' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!prototypeData) {
      console.error(`[${requestId}] No prototype found with ID: ${prototypeId}`);
      return new Response(
        JSON.stringify({ error: 'Prototype not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Download the uploaded file
    console.log(`[${requestId}] Downloading file from storage`);
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('prototype-uploads')
      .download(`${prototypeId}/${fileName}`);

    if (downloadError) {
      console.error(`[${requestId}] Download error: ${downloadError.message}`);
      return new Response(
        JSON.stringify({ error: 'Failed to download prototype file' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isZip = fileName.toLowerCase().endsWith('.zip');
    const deploymentPath = `${prototypeId}`;
    
    if (isZip) {
      console.log(`[${requestId}] Processing ZIP file`);
      
      try {
        const fileSize = fileData.size;
        // Check file size (10MB limit)
        if (fileSize > 10 * 1024 * 1024) {
          console.error(`[${requestId}] File too large: ${fileSize} bytes`);
          return new Response(
            JSON.stringify({ error: 'File size exceeds 10MB limit' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const zipData = new Uint8Array(await fileData.arrayBuffer());
        console.log(`[${requestId}] Unzipping file of size: ${zipData.length} bytes`);
        
        const unzippedFiles = await unzip(zipData) as UnzippedFile[];
        console.log(`[${requestId}] Found ${unzippedFiles.length} files in ZIP`);

        try {
          const { indexHtml, hasCss, hasJs } = validateFiles(unzippedFiles);
          
          // Process each file
          for (const file of unzippedFiles) {
            if (
              file.content.length > 0 &&
              !file.name.startsWith('__MACOSX/') &&
              !file.name.startsWith('._') &&
              !file.name.endsWith('/')
            ) {
              console.log(`[${requestId}] Processing file: ${file.name}`);
              
              let fileContent = file.content;
              
              if (file.name.toLowerCase() === 'index.html') {
                try {
                  const parser = new DOMParser();
                  const doc = parser.parseFromString(
                    new TextDecoder().decode(file.content),
                    'text/html'
                  );
                  
                  if (!doc) {
                    throw new Error('Failed to parse HTML');
                  }
                  
                  const sanitizedHTML = doc.documentElement.outerHTML;
                  fileContent = new TextEncoder().encode(sanitizedHTML);
                } catch (error) {
                  console.error(`[${requestId}] HTML processing error: ${error}`);
                  return new Response(
                    JSON.stringify({ error: 'Invalid HTML content' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                  );
                }
              }

              const { error: uploadError } = await supabase.storage
                .from('prototype-deployments')
                .upload(`${deploymentPath}/${file.name}`, fileContent, {
                  contentType: getContentType(file.name),
                  upsert: true
                });

              if (uploadError) {
                console.error(`[${requestId}] Upload error for ${file.name}: ${uploadError.message}`);
                return new Response(
                  JSON.stringify({ error: `Failed to upload file: ${file.name}` }),
                  { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }
              
              console.log(`[${requestId}] Successfully uploaded ${file.name}`);
            }
          }
        } catch (error) {
          console.error(`[${requestId}] ZIP processing error: ${error}`);
          return new Response(
            JSON.stringify({ error: 'Failed to process ZIP contents' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (error) {
        console.error(`[${requestId}] ZIP extraction error: ${error}`);
        return new Response(
          JSON.stringify({ error: 'Failed to extract ZIP file' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Handle single file upload
      console.log(`[${requestId}] Processing single file`);
      const { error: uploadError } = await supabase.storage
        .from('prototype-deployments')
        .upload(`${deploymentPath}/${fileName}`, fileData, {
          contentType: getContentType(fileName),
          upsert: true
        });

      if (uploadError) {
        console.error(`[${requestId}] Single file upload error: ${uploadError.message}`);
        return new Response(
          JSON.stringify({ error: 'Failed to upload file' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Update prototype status
    const { error: updateError } = await supabase
      .from('prototypes')
      .update({ deployment_status: 'deployed' })
      .eq('id', prototypeId);

    if (updateError) {
      console.error(`[${requestId}] Status update error: ${updateError.message}`);
      return new Response(
        JSON.stringify({ error: 'Failed to update prototype status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${requestId}] Successfully processed prototype`);
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`[${requestId}] Unhandled error: ${error}`);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getContentType(name: string): string {
  if (name.endsWith('.html')) return 'text/html';
  if (name.endsWith('.css')) return 'text/css';
  if (name.endsWith('.js')) return 'text/javascript';
  if (name.endsWith('.json')) return 'application/json';
  return 'text/plain';
}

function validateFiles(files: UnzippedFile[]): { indexHtml: UnzippedFile, hasCss: boolean, hasJs: boolean } {
  let indexHtml: UnzippedFile | undefined;
  let hasCss = false;
  let hasJs = false;

  for (const file of files) {
    if (file.name.toLowerCase() === 'index.html') {
      indexHtml = file;
    } else if (file.name.endsWith('.css')) {
      hasCss = true;
    } else if (file.name.endsWith('.js')) {
      hasJs = true;
    }
  }

  if (!indexHtml) {
    throw new Error('No index.html file found in the prototype');
  }

  return { indexHtml, hasCss, hasJs };
}
