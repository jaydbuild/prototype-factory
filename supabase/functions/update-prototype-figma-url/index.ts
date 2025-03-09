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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      // Create client with Auth context of the user that called the function
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the request body
    const { prototypeId, figmaUrl } = await req.json() as RequestBody;

    if (!prototypeId || !figmaUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { headers: { 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // First, check if the column exists
    const { data: columnExists, error: columnCheckError } = await supabaseClient.rpc(
      'column_exists',
      { table_name: 'prototypes', column_name: 'figma_url' }
    ).single();

    if (columnCheckError) {
      console.error('Error checking if column exists:', columnCheckError);
      
      // Try a direct SQL approach as a fallback
      try {
        // Use raw SQL to add the column if it doesn't exist
        await supabaseClient.rpc(
          'add_column_if_not_exists',
          { 
            table_name: 'prototypes', 
            column_name: 'figma_url',
            column_type: 'text'
          }
        );
      } catch (sqlError) {
        console.error('Error adding column:', sqlError);
        // Continue anyway, as the column might already exist
      }
    }

    // Update the prototype with the Figma URL
    const { error: updateError } = await supabaseClient
      .from('prototypes')
      .update({ figma_url: figmaUrl })
      .eq('id', prototypeId);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
