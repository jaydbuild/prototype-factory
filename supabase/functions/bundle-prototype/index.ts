/// <reference lib="deno.ns" />
/// <reference lib="deno.window" />

import { serve, createClient, esbuild, unzip } from "./deps.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BundleRequest {
  prototypeId: string;
  version?: string;
}

interface UnzippedFile {
  name: string;
  content: Uint8Array;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { prototypeId, version = 'latest' } = await req.json() as BundleRequest
    
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get prototype details
    const { data: prototype, error: prototypeError } = await supabase
      .from('prototypes')
      .select('*')
      .eq('id', prototypeId)
      .single()

    if (prototypeError) throw prototypeError

    // Download the ZIP file
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('prototypes')
      .download(prototype.file_path)

    if (downloadError) throw downloadError

    // Unzip the content
    const zipData = new Uint8Array(await fileData.arrayBuffer())
    const unzippedFiles = await unzip(zipData) as UnzippedFile[]

    // Process files
    const htmlFile = unzippedFiles.find(f => f.name.endsWith('index.html'))
    const cssFiles = unzippedFiles.filter(f => f.name.endsWith('.css'))
    const jsFiles = unzippedFiles.filter(f => f.name.endsWith('.js'))

    if (!htmlFile) throw new Error('No index.html found in prototype')

    // Bundle JS files
    const bundledJs = await esbuild.build({
      stdin: {
        contents: jsFiles.map(f => new TextDecoder().decode(f.content)).join('\n'),
        loader: 'js',
      },
      bundle: true,
      minify: true,
      format: 'esm',
      write: false,
    })

    // Create final HTML with bundled resources
    const html = new TextDecoder().decode(htmlFile.content)
      .replace('</head>', `
        <style>${cssFiles.map(f => new TextDecoder().decode(f.content)).join('\n')}</style>
        <script type="module">${bundledJs.outputFiles[0].text}</script>
        </head>
      `)

    // Add sandbox security measures
    const secureHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' 'unsafe-eval'; img-src 'self' data: https:; connect-src 'self' https:;">
          ${html}
        </head>
      </html>
    `

    // Store the bundled version
    const bundlePath = `bundles/${prototypeId}/${version}.html`
    const { error: uploadError } = await supabase
      .storage
      .from('prototypes')
      .upload(bundlePath, secureHtml, {
        contentType: 'text/html',
        cacheControl: '3600',
        upsert: true,
      })

    if (uploadError) throw uploadError

    // Get the public URL
    const { data: { publicUrl }, error: urlError } = await supabase
      .storage
      .from('prototypes')
      .getPublicUrl(bundlePath)

    if (urlError) throw urlError

    // Update prototype with preview URL
    await supabase
      .from('prototypes')
      .update({
        preview_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', prototypeId)

    return new Response(
      JSON.stringify({ previewUrl: publicUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Bundling error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
