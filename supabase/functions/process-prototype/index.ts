
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { extract } from "https://deno.land/x/zip@v1.2.3/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { prototypeId, fileName } = await req.json()

    console.log(`Processing prototype ${prototypeId} with file ${fileName}`)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Download the uploaded file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('prototype-uploads')
      .download(`${prototypeId}/${fileName}`)

    if (downloadError) {
      throw new Error(`Failed to download file: ${downloadError.message}`)
    }

    // Process the file based on its type
    const isZip = fileName.endsWith('.zip')
    const deploymentPath = `${prototypeId}`
    
    if (isZip) {
      // Extract zip contents
      const zipBlob = new Blob([fileData])
      const zipBuffer = await zipBlob.arrayBuffer()
      const files = await extract(new Uint8Array(zipBuffer))
      
      // Upload each extracted file
      for (const [path, content] of Object.entries(files)) {
        const { error: uploadError } = await supabase.storage
          .from('prototype-deployments')
          .upload(`${deploymentPath}/${path}`, content, {
            contentType: getContentType(path),
            upsert: true
          })

        if (uploadError) {
          throw new Error(`Failed to upload extracted file ${path}: ${uploadError.message}`)
        }
      }
    } else {
      // Upload single file directly
      const { error: uploadError } = await supabase.storage
        .from('prototype-deployments')
        .upload(`${deploymentPath}/index.html`, fileData, {
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
      .getPublicUrl(`${deploymentPath}/index.html`)

    // Update prototype status
    const { error: updateError } = await supabase
      .from('prototypes')
      .update({
        deployment_status: 'deployed',
        deployment_url: publicUrl,
        file_path: `${prototypeId}/${fileName}`
      })
      .eq('id', prototypeId)

    if (updateError) {
      throw new Error(`Failed to update prototype status: ${updateError.message}`)
    }

    return new Response(
      JSON.stringify({ 
        status: 'success',
        url: publicUrl
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  } catch (error) {
    console.error('Error processing prototype:', error)

    return new Response(
      JSON.stringify({
        status: 'error',
        message: error.message
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
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
    case 'png': return 'image/png'
    case 'jpg':
    case 'jpeg': return 'image/jpeg'
    case 'gif': return 'image/gif'
    case 'svg': return 'image/svg+xml'
    default: return 'application/octet-stream'
  }
}
