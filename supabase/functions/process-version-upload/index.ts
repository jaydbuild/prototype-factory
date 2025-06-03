import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
// Using JSZip for browser-compatible ZIP extraction
import JSZip from 'https://esm.sh/jszip@3.10.1'

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
    console.log("Process version upload function called");
    
    // Parse the request body as JSON
    const { prototypeId, versionId, filePath } = await req.json();
    
    console.log(`Processing version: ${versionId} for prototype: ${prototypeId}, file: ${filePath}`);

    if (!prototypeId || !versionId || !filePath) {
      throw new Error('Missing required parameters: prototypeId, versionId, and filePath');
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get version details to determine version number
    const { data: version, error: versionError } = await supabase
      .from('prototype_versions')
      .select('version_number')
      .eq('id', versionId)
      .single();
      
    if (versionError || !version) {
      throw new Error('Error fetching version details');
    }
    
    const versionNumber = version.version_number;
    
    try {
      // Get the uploaded file from storage
      console.log(`Downloading file from storage: ${filePath}`);
      const { data: fileData, error: fileError } = await supabase.storage
        .from('prototype-uploads')
        .download(filePath);

      if (fileError || !fileData) {
        throw new Error(`Error downloading file: ${fileError?.message || 'Unknown error'}`);
      }
      
      // Create a temporary directory for extraction
      const tempDir = await Deno.makeTempDir();
      console.log(`Created temp dir: ${tempDir}`);
      
      try {
        // Extract the ZIP file
        console.log('Extracting ZIP file');
        const zipArrayBuffer = await fileData.arrayBuffer();
        const jszip = new JSZip();
        const zipContents = await jszip.loadAsync(zipArrayBuffer);
        
        // Extract each file from the ZIP
        for (const [filename, zipEntry] of Object.entries(zipContents.files)) {
          // Type assertion for zipEntry
          const entry = zipEntry as { dir: boolean, async: (type: string) => Promise<Uint8Array> };
          
          // Skip directories and macOS system files
          if (entry.dir || filename.includes('__MACOSX') || filename.startsWith('.')) {
            continue;
          }
          
          const content = await entry.async('uint8array');
          const filePath = `${tempDir}/${filename}`;
          
          // Create directory if it doesn't exist
          const directory = filePath.substring(0, filePath.lastIndexOf('/'));
          try {
            await Deno.mkdir(directory, { recursive: true });
          } catch (e) {
            // Directory might already exist, ignore
          }
          
          // Write the file
          await Deno.writeFile(filePath, content);
        }
        
        // Check if index.html exists
        try {
          const indexHtml = await Deno.readFile(`${tempDir}/index.html`);
          console.log('Found index.html');
        } catch (e) {
          throw new Error('Missing index.html in uploaded ZIP');
        }
        
        // Upload extracted files to the deployments bucket
        console.log('Uploading extracted files');
        const deploymentPath = `prototypes/${prototypeId}/v${versionNumber}`;
        
        // Get all files in the temp directory recursively
        async function* getFiles(dir: string): AsyncGenerator<string> {
          for await (const entry of Deno.readDir(dir)) {
            const filePath = `${dir}/${entry.name}`;
            if (entry.isDirectory) {
              yield* getFiles(filePath);
            } else {
              // Skip macOS system files
              if (!entry.name.startsWith('.') && !entry.name.startsWith('__MACOSX')) {
                yield filePath;
              }
            }
          }
        }
        
        // Upload each file
        for await (const filePath of getFiles(tempDir)) {
          const fileContent = await Deno.readFile(filePath);
          const relativePath = filePath.replace(`${tempDir}/`, '');
          
          const { error: uploadError } = await supabase.storage
            .from('prototype-deployments')
            .upload(`${deploymentPath}/${relativePath}`, fileContent, {
              contentType: getContentType(relativePath),
              upsert: true
            });
            
          if (uploadError) {
            console.error(`Error uploading ${relativePath}: ${uploadError.message}`);
          } else {
            console.log(`Uploaded ${relativePath}`);
          }
        }
        
        // Create a signed URL for the index.html file
        const { data: { signedURL }, error: signedUrlError } = await supabase.storage
          .from('prototype-deployments')
          .createSignedUrl(`${deploymentPath}/index.html`, 60 * 60 * 24 * 7); // 7 days
          
        if (signedUrlError) {
          throw new Error(`Error creating signed URL: ${signedUrlError.message}`);
        }
        
        // Update the version record with the success status and URLs
        const { error: updateError } = await supabase
          .from('prototype_versions')
          .update({
            status: 'ready',
            preview_url: signedURL,
            base_path: `${deploymentPath}`
          })
          .eq('id', versionId);
          
        if (updateError) {
          throw new Error(`Error updating version record: ${updateError.message}`);
        }
        
        console.log('Version processing completed successfully');
        
        return new Response(
          JSON.stringify({ success: true, message: 'Version processed successfully' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
        
      } finally {
        // Clean up temporary directory
        try {
          await Deno.remove(tempDir, { recursive: true });
          console.log(`Removed temp dir: ${tempDir}`);
        } catch (e) {
          console.error(`Error removing temp dir: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      }
    } catch (innerError) {
      // Update version status to failed
      await supabase
        .from('prototype_versions')
        .update({
          status: 'failed',
          error_message: innerError instanceof Error ? innerError.message : 'Unknown error during processing'
        })
        .eq('id', versionId);
        
      throw innerError;
    }
  } catch (error) {
    console.error('Error processing version:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(
      JSON.stringify({ success: false, message: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Helper function to determine content type
function getContentType(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  const contentTypes: Record<string, string> = {
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'json': 'application/json',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    'woff': 'font/woff',
    'woff2': 'font/woff2',
    'ttf': 'font/ttf',
    'otf': 'font/otf',
    'eot': 'application/vnd.ms-fontobject'
  };
  
  return contentTypes[extension || ''] || 'application/octet-stream';
}
