import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { extract } from 'https://deno.land/x/zipjs/index.js'
import { join } from 'https://deno.land/std@0.168.0/path/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProcessPrototypeBody {
  prototypeId: string;
  folderPath: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const { prototypeId, folderPath } = await req.json() as ProcessPrototypeBody

    // Update status to processing
    await supabaseClient
      .from('prototypes')
      .update({ deployment_status: 'pending' })
      .eq('id', prototypeId)

    // Create temporary directory for processing
    const tempDir = await Deno.makeTempDir()
    
    // Download files from storage
    const { data: files } = await supabaseClient
      .storage
      .from('prototype-files')
      .list(folderPath)

    if (!files?.length) {
      throw new Error('No files found')
    }

    // Check if we have a zip file
    const zipFile = files.find(f => f.name.endsWith('.zip'))
    
    if (zipFile) {
      // Download and extract zip
      const { data } = await supabaseClient
        .storage
        .from('prototype-files')
        .download(`${folderPath}/${zipFile.name}`)

      if (!data) throw new Error('Failed to download zip file')

      // Extract zip contents
      await extract(data, { dir: tempDir })
    } else {
      // Download individual files
      for (const file of files) {
        const { data } = await supabaseClient
          .storage
          .from('prototype-files')
          .download(`${folderPath}/${file.name}`)

        if (!data) continue

        await Deno.writeFile(
          join(tempDir, file.name),
          new Uint8Array(await data.arrayBuffer())
        )
      }
    }

    // Validate required files
    const hasHtml = await fileExists(tempDir, '.html')
    if (!hasHtml) {
      throw new Error('No HTML file found in upload')
    }

    // Upload processed files to deployment bucket
    const deploymentPath = `deployments/${prototypeId}`
    
    // Upload all files in temp directory
    for await (const entry of Deno.readDir(tempDir)) {
      if (entry.isFile) {
        const fileContent = await Deno.readFile(join(tempDir, entry.name))
        
        await supabaseClient
          .storage
          .from('prototype-deployments')
          .upload(`${deploymentPath}/${entry.name}`, fileContent, {
            contentType: getContentType(entry.name),
            upsert: true
          })
      }
    }

    // Get public URL for the HTML file
    const { data: { publicUrl } } = await supabaseClient
      .storage
      .from('prototype-deployments')
      .getPublicUrl(`${deploymentPath}/index.html`)

    // Update prototype with deployment URL
    await supabaseClient
      .from('prototypes')
      .update({
        deployment_status: 'deployed',
        deployment_url: publicUrl
      })
      .eq('id', prototypeId)

    // Clean up temp directory
    await Deno.remove(tempDir, { recursive: true })

    return new Response(
      JSON.stringify({ success: true, deploymentUrl: publicUrl }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error processing prototype:', error)

    // Update prototype status to failed
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const { prototypeId } = await req.json() as ProcessPrototypeBody
    
    await supabaseClient
      .from('prototypes')
      .update({ deployment_status: 'failed' })
      .eq('id', prototypeId)

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

async function fileExists(dir: string, extension: string): Promise<boolean> {
  for await (const entry of Deno.readDir(dir)) {
    if (entry.isFile && entry.name.endsWith(extension)) {
      return true
    }
  }
  return false
}

function getContentType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'html': return 'text/html'
    case 'css': return 'text/css'
    case 'js': return 'text/javascript'
    case 'png': return 'image/png'
    case 'jpg':
    case 'jpeg': return 'image/jpeg'
    case 'gif': return 'image/gif'
    case 'svg': return 'image/svg+xml'
    default: return 'application/octet-stream'
  }
}
