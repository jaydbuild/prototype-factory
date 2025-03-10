import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface RequestBody {
  prototypeId: string;
  figmaUrl: string;
}

serve(async (req) => {
  try {
    // Create a Supabase client with the Auth context of the function
    const supabaseClient = createClient(
      // Supabase API URL - env var exposed by default when deployed
      Deno.env.get('SUPABASE_URL') ?? '',
      // Supabase API ANON KEY - env var exposed by default when deployed
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Get the request body
    const { prototypeId, figmaUrl } = await req.json() as RequestBody;

    if (!prototypeId || !figmaUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { headers: { 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // First, try to add the column if it doesn't exist using raw SQL
    try {
      // Use raw SQL to add the column if it doesn't exist
      await supabaseClient.from('_pgrst_reserved_dummy').rpc('', {}, {
        headers: {
          'Content-Profile': 'postgres',
          'Prefer': 'params=single-object'
        },
        body: `ALTER TABLE public.prototypes ADD COLUMN IF NOT EXISTS figma_url TEXT`
      });
    } catch (sqlError) {
      console.error('Error adding column:', sqlError);
      // Continue anyway, as the column might already exist
    }

    // Update the prototype with the Figma URL using direct SQL to bypass schema issues
    try {
      // Try standard update first
      const { error } = await supabaseClient
        .from('prototypes')
        .update({ figma_url: figmaUrl })
        .eq('id', prototypeId);
        
      if (error) {
        // If that fails, try direct SQL
        await supabaseClient.from('_pgrst_reserved_dummy').rpc('', {}, {
          headers: {
            'Content-Profile': 'postgres',
            'Prefer': 'params=single-object'
          },
          body: `UPDATE public.prototypes SET figma_url = '${figmaUrl}' WHERE id = '${prototypeId}'`
        });
      }
    } catch (updateError: unknown) {
      console.error('Error updating prototype:', updateError);
      if (updateError instanceof Error) {
        throw updateError;
      } else {
        throw new Error('Unknown error updating prototype');
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
