
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
    console.log("Process prototype function called");
    
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
    console.log("Updating prototype status to processing");
    await supabase
      .from('prototypes')
      .update({ 
        deployment_status: 'processing',
        status: 'processing'
      })
      .eq('id', prototypeId);

    try {
      // Get the uploaded file from storage
      console.log(`Downloading file from storage: ${prototypeId}/${fileName}`);
      const { data: fileData, error: fileError } = await supabase.storage
        .from('prototype-uploads')
        .download(`${prototypeId}/${fileName}`);

      if (fileError) {
        console.error('Error downloading file:', fileError);
        throw new Error(`Failed to download file: ${fileError.message}`);
      }

      if (!fileData || fileData.size === 0) {
        throw new Error('File data is empty or not found');
      }

      console.log(`File downloaded: ${fileData.size} bytes`);

      // For very large files (>500MB), add a warning log
      if (fileData.size > 500 * 1024 * 1024) {
        console.log(`Warning: Processing large file (${Math.round(fileData.size / (1024 * 1024))}MB). This may take longer.`);
      }

      // Process based on file type
      if (fileName.endsWith('.zip')) {
        console.log('Processing ZIP file containing web files (HTML, React, etc.)');
        await processZipFile(supabase, prototypeId, fileName, fileData);
      } else if (fileName.endsWith('.html') || fileName.endsWith('.htm')) {
        console.log('Processing HTML file');
        await processHtmlFile(supabase, prototypeId, fileData);
      } else if (fileName.endsWith('.jsx') || fileName.endsWith('.tsx') || fileName.endsWith('.js') || fileName.endsWith('.ts')) {
        console.log('Processing JavaScript/React file');
        await processReactFile(supabase, prototypeId, fileName, fileData);
      } else {
        throw new Error(`Unsupported file type: ${fileName}. Please upload an HTML, React, or ZIP archive.`);
      }
      
      // Get the deployment URL
      console.log('Getting deployment URL');
      const { data: publicUrlData } = await supabase.storage
        .from('prototype-deployments')
        .getPublicUrl(`${prototypeId}/index.html`);
      
      const deploymentUrl = publicUrlData?.publicUrl;
      console.log(`Deployment URL: ${deploymentUrl}`);
      
      // Update prototype with status and URL
      console.log('Updating prototype with deployed status and URL');
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
    } catch (processingError) {
      console.error('Error during processing:', processingError);
      
      // Update prototype status to failed
      await supabase
        .from('prototypes')
        .update({
          deployment_status: 'failed',
          status: 'failed',
          processed_at: new Date().toISOString()
        })
        .eq('id', prototypeId);
      
      throw processingError;
    }

  } catch (error) {
    console.error('Error processing prototype:', error);
    
    try {
      // Try to update the prototype status to failed
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      // Get prototypeId from the request
      let prototypeId;
      try {
        const reqBody = await req.clone().json();
        prototypeId = reqBody.prototypeId;
      } catch (parseError) {
        console.error('Error parsing request body:', parseError);
      }
      
      if (prototypeId) {
        console.log(`Updating prototype ${prototypeId} status to failed`);
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

// Helper function to process HTML files
async function processHtmlFile(supabase, prototypeId, fileData) {
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
}

// Helper function to process React files
async function processReactFile(supabase, prototypeId, fileName, fileData) {
  // Create a simple HTML wrapper for React files
  const reactWrapper = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>React App Preview</title>
        <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
        <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
        <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
        <style>
            body { font-family: system-ui, sans-serif; padding: 20px; }
            #root { border: 1px solid #eee; padding: 20px; border-radius: 5px; }
        </style>
    </head>
    <body>
        <div id="root"></div>
        <script type="text/babel">
        ${new TextDecoder().decode(fileData)}
        </script>
    </body>
    </html>
  `;
  
  // Upload the React wrapper HTML file
  const { error: uploadError } = await supabase.storage
    .from('prototype-deployments')
    .upload(`${prototypeId}/index.html`, new TextEncoder().encode(reactWrapper), {
      contentType: 'text/html',
      upsert: true
    });
    
  if (uploadError) {
    console.error('Error uploading React wrapper file:', uploadError);
    throw new Error(`Failed to upload React wrapper file: ${uploadError.message}`);
  }

  // Upload the original React file as well
  const { error: reactFileError } = await supabase.storage
    .from('prototype-deployments')
    .upload(`${prototypeId}/${fileName}`, fileData, {
      contentType: fileName.endsWith('.jsx') || fileName.endsWith('.tsx') ? 'text/jsx' : 'application/javascript',
      upsert: true
    });
    
  if (reactFileError) {
    console.error('Error uploading original React file:', reactFileError);
    // Non-blocking: continue even if original file upload fails
  }
}

// Helper function to process ZIP files
async function processZipFile(supabase, prototypeId, fileName, fileData) {
  console.log(`Processing ZIP file: ${fileName} (${Math.round(fileData.size / 1024)} KB)`);
  
  // For a comprehensive ZIP processing, we would unzip the file and look for React/HTML files
  // For now, we create a simple HTML file as a placeholder for ZIP files
  // In the future, this should be enhanced to extract React components and create appropriate index.html
  
  const simpleHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Project Preview</title>
        <style>
            body {
                font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                padding: 20px;
                text-align: center;
                background-color: #f5f5f5;
            }
            .container {
                background-color: white;
                border-radius: 8px;
                padding: 20px 30px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                max-width: 500px;
                width: 100%;
            }
            h1 {
                font-size: 1.5rem;
                margin-bottom: 1rem;
                color: #333;
            }
            p {
                color: #666;
                line-height: 1.5;
            }
            .info {
                margin-top: 20px;
                padding: 12px;
                background-color: #f0f9ff;
                border: 1px solid #baddff;
                border-radius: 6px;
                font-size: 0.9rem;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Project Successfully Deployed</h1>
            <p>
                Your project file "${fileName}" has been processed successfully.
            </p>
            <div class="info">
                <strong>ZIP File Contents</strong>: For more complex projects, consider using our SandpackPreview component which can handle React and other modern frameworks.
            </div>
        </div>
    </body>
    </html>
  `;
  
  // Upload the simple HTML file
  const { error: uploadError } = await supabase.storage
    .from('prototype-deployments')
    .upload(`${prototypeId}/index.html`, new TextEncoder().encode(simpleHtml), {
      contentType: 'text/html',
      upsert: true
    });
    
  if (uploadError) {
    console.error('Error uploading HTML file:', uploadError);
    throw new Error(`Failed to upload HTML file: ${uploadError.message}`);
  }
  
  // Upload the original ZIP file as well for potential download
  const { error: zipFileError } = await supabase.storage
    .from('prototype-deployments')
    .upload(`${prototypeId}/${fileName}`, fileData, {
      contentType: 'application/zip',
      upsert: true
    });
    
  if (zipFileError) {
    console.error('Error uploading original ZIP file:', zipFileError);
    // Non-blocking: continue even if zip file upload fails
  }
}
