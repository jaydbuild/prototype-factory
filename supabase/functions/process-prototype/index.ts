import { serve, createClient, unzip } from '../bundle-prototype/deps.ts';
import type { UnzippedFile } from "../types/prototypes.ts";

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

    // First, verify the prototype exists and check its current state
    const { data: prototypeData, error: prototypeError } = await supabase
      .from('prototypes')
      .select('*')
      .eq('id', prototypeId)
      .single()

    if (prototypeError) {
      console.error(`Failed to fetch prototype: ${prototypeError.message}`)
      throw new Error(`Prototype verification failed: ${prototypeError.message}`)
    }

    if (!prototypeData) {
      console.error(`No prototype found with ID: ${prototypeId}`)
      throw new Error('Prototype not found')
    }

    console.log(`Current prototype state: ${JSON.stringify(prototypeData)}`)

    // Download the uploaded file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('prototype-uploads')
      .download(`${prototypeId}/${fileName}`)

    if (downloadError) {
      console.error(`Download error: ${downloadError.message}`)
      throw new Error(`Failed to download file: ${downloadError.message}`)
    }

    console.log('File downloaded successfully, beginning processing...')

    // Process the file based on its type
    const isZip = fileName.toLowerCase().endsWith('.zip')
    const deploymentPath = `${prototypeId}`
    
    if (isZip) {
      console.log('Processing ZIP file')
      
      try {
        // Convert ArrayBuffer to Uint8Array
        const zipData = new Uint8Array(await fileData.arrayBuffer())
        
        // Unzip the content
        const unzippedFiles = await unzip(zipData) as UnzippedFile[];
        
        console.log(`Found ${unzippedFiles.length} files in ZIP`)
        
        // Process each file in the zip
        for (const file of unzippedFiles) {
          // Skip Mac metadata files and empty files
          if (
            file.content.length > 0 && // Skip empty files/directories
            !file.name.startsWith('__MACOSX/') && // Skip Mac metadata directory
            !file.name.startsWith('._') && // Skip Mac metadata files
            !file.name.endsWith('/') // Skip directory entries
          ) {
            const { error: uploadError } = await supabase.storage
              .from('prototype-deployments')
              .upload(`${deploymentPath}/${file.name}`, file.content, {
                contentType: getContentType(file.name),
                upsert: true
              })

            if (uploadError) {
              throw new Error(`Failed to upload extracted file ${file.name}: ${uploadError.message}`)
            }
            
            console.log(`Uploaded ${file.name}`)
          } else {
            console.log(`Skipping file ${file.name} (metadata or directory)`)
          }
        }
      } catch (error: unknown) {
        console.error('Error processing ZIP:', error)
        throw new Error(`Failed to process ZIP file: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    } else {
      // Upload single file directly
      console.log('Processing single file')
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

    console.log(`Generated public URL: ${publicUrl}`)

    // First, let's check what fields exist in the table
    const { data: tableInfo, error: tableError } = await supabase
      .from('prototypes')
      .select('*')
      .limit(1)

    if (tableError) {
      console.error(`Failed to fetch table info: ${tableError.message}`)
      throw new Error(`Schema verification failed: ${tableError.message}`)
    }

    console.log('Available columns:', Object.keys(tableInfo?.[0] || {}))

    // Update with minimal fields
    const updateData: Record<string, any> = {
      deployment_url: publicUrl
    }

    // Only add these if they exist in the schema
    if (tableInfo?.[0]?.hasOwnProperty('deployment_status')) {
      updateData.deployment_status = 'deployed'
    }
    if (tableInfo?.[0]?.hasOwnProperty('file_path')) {
      updateData.file_path = `${prototypeId}/${fileName}`
    }

    console.log('Updating with fields:', updateData)

    const { error: updateError } = await supabase
      .from('prototypes')
      .update(updateData)
      .eq('id', prototypeId)

    if (updateError) {
      console.error(`Failed to update prototype: ${updateError.message}`)
      throw new Error(`Failed to update prototype status: ${updateError.message}`)
    }

    console.log(`Processing complete, deployed at ${publicUrl}`)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Prototype processed successfully',
        prototypeId,
        url: publicUrl
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error(`Processing failed: ${error.message}`)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
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
    case 'png': return 'image/png'
    case 'jpg':
    case 'jpeg': return 'image/jpeg'
    case 'gif': return 'image/gif'
    case 'svg': return 'image/svg+xml'
    default: return 'application/octet-stream'
  }
}
