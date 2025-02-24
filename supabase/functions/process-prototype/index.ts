import { serve, createClient, unzip, esbuild } from '../bundle-prototype/deps.ts';
import type { UnzippedFile } from "../types/prototypes.ts";

// Type declarations
interface PrototypeRequest {
  prototypeId: string;
  fileName: string;
}

interface PrototypeState {
  id: string;
  status: 'pending' | 'processing' | 'processed' | 'failed';
  deployment_url?: string;
  processed_at?: Date;
  bundle_path?: string;
  sandbox_config?: {
    permissions: string[];
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { prototypeId, fileName } = await req.json() as PrototypeRequest
    console.log(`Starting processing for prototype ${prototypeId} with file ${fileName}`)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Update status to processing
    await supabase
      .from('prototypes')
      .update({ status: 'processing' })
      .eq('id', prototypeId)

    // Download the uploaded file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('prototype-uploads')
      .download(`${prototypeId}/${fileName}`)

    if (downloadError) {
      throw new Error(`Failed to download file: ${downloadError.message}`)
    }

    // Process the file based on its type
    const isZip = fileName.toLowerCase().endsWith('.zip')
    const deploymentPath = `${prototypeId}`
    let bundlePath: string | undefined

    if (isZip) {
      console.log('Processing ZIP file')
      try {
        const files = await unzip(new Uint8Array(await fileData.arrayBuffer()))
        
        // Find the entry point (index.html)
        const indexFile = files.find(f => f.name.toLowerCase() === 'index.html')
        if (!indexFile) {
          throw new Error('No index.html found in ZIP')
        }

        // Bundle the code using esbuild
        const result = await esbuild.build({
          entryPoints: ['index.html'],
          bundle: true,
          write: false,
          format: 'esm',
          sourcemap: true,
          minify: true,
          loader: {
            '.html': 'text',
            '.js': 'js',
            '.css': 'css',
          },
        })

        // Upload the bundled code
        const { error: uploadError } = await supabase.storage
          .from('prototype-deployments')
          .upload(`${deploymentPath}/bundle.js`, result.outputFiles[0].contents, {
            contentType: 'application/javascript',
            upsert: true
          })

        if (uploadError) {
          throw new Error(`Failed to upload bundle: ${uploadError.message}`)
        }

        bundlePath = `${deploymentPath}/bundle.js`
      } catch (error) {
        console.error('Error processing ZIP:', error)
        throw new Error(`Failed to process ZIP file: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    } else {
      // For single file uploads, treat as the bundle
      bundlePath = `${deploymentPath}/index.html`
      const { error: uploadError } = await supabase.storage
        .from('prototype-deployments')
        .upload(bundlePath, fileData, {
          contentType: 'text/html',
          upsert: true
        })

      if (uploadError) {
        throw new Error(`Failed to upload file: ${uploadError.message}`)
      }
    }

    // Get the public URL for the deployed prototype
    const { data: { publicUrl } } = supabase.storage
      .from('prototype-deployments')
      .getPublicUrl(bundlePath!)

    // Update prototype with final state
    const updateData: Partial<PrototypeState> = {
      status: 'processed',
      deployment_url: publicUrl,
      processed_at: new Date(),
      bundle_path: bundlePath,
      sandbox_config: {
        permissions: ['allow-scripts', 'allow-same-origin']
      }
    }

    const { error: updateError } = await supabase
      .from('prototypes')
      .update(updateData)
      .eq('id', prototypeId)

    if (updateError) {
      console.error(`Failed to update prototype: ${updateError.message}`)
      throw new Error(`Failed to update prototype status: ${updateError.message}`)
    }

    // Log final state for debugging
    const { data: finalState } = await supabase
      .from('prototypes')
      .select('*')
      .eq('id', prototypeId)
      .single()
    
    console.log('Final prototype state:', finalState)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Prototype processed successfully',
        prototypeId,
        url: publicUrl,
        sandbox_config: updateData.sandbox_config
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    // Update status to failed if there's an error
    const { prototypeId } = await req.json() as PrototypeRequest
    if (prototypeId) {
      await supabase
        .from('prototypes')
        .update({ 
          status: 'failed',
          processed_at: new Date()
        })
        .eq('id', prototypeId)
    }

    console.error(`Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

function getContentType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'html': return 'text/html'
    case 'css': return 'text/css'
    case 'js': return 'application/javascript'
    case 'json': return 'application/json'
    case 'png': return 'image/png'
    case 'jpg':
    case 'jpeg': return 'image/jpeg'
    case 'gif': return 'image/gif'
    case 'svg': return 'image/svg+xml'
    default: return 'application/octet-stream'
  }
}
