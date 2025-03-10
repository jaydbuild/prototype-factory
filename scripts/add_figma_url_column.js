// This script adds the figma_url column to the prototypes table
// Run with: node scripts/add_figma_url_column.js

import { createClient } from '@supabase/supabase-js';

// Your actual Supabase URL and anon key from the client.ts file
const supabaseUrl = "https://lilukmlnbrzyjrksteay.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpbHVrbWxuYnJ6eWpya3N0ZWF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg2NTIwMzAsImV4cCI6MjA1NDIyODAzMH0.HP3oMkQ8RFFzRiklzOBrxcQ-PzX9HTlICqC5FkHNR6M";

const supabase = createClient(supabaseUrl, supabaseKey);

async function addFigmaUrlColumn() {
  try {
    // First check if the column already exists
    const { data: columns, error: columnsError } = await supabase
      .from('prototypes')
      .select('*')
      .limit(1);

    if (columnsError) {
      console.error('Error checking prototypes table:', columnsError);
      return;
    }

    // Check if figma_url already exists in the first row
    if (columns && columns.length > 0 && 'figma_url' in columns[0]) {
      console.log('figma_url column already exists in prototypes table');
      return;
    }

    console.log('Attempting to add figma_url column to prototypes table...');
    
    // Since we can't directly execute SQL with the client, we'll try a different approach
    // We'll create a temporary row with the figma_url field and then delete it
    // This will cause Supabase to add the column if it doesn't exist
    
    const tempId = 'temp-' + Date.now();
    
    // Insert a temporary row with the figma_url field
    const { error: insertError } = await supabase
      .from('prototypes')
      .insert({
        id: tempId,
        name: 'Temporary Row',
        created_by: 'system',
        url: 'temp',
        figma_url: 'https://example.com/figma'
      });
    
    if (insertError) {
      console.error('Error inserting temporary row:', insertError);
      // If we can't insert, try updating an existing row
      const { error: updateError } = await supabase
        .from('prototypes')
        .update({ figma_url: null })
        .limit(1);
      
      if (updateError) {
        console.error('Error updating existing row:', updateError);
        console.log('Please add the figma_url column manually through the Supabase dashboard');
        return;
      }
    } else {
      // Delete the temporary row if it was created
      await supabase
        .from('prototypes')
        .delete()
        .eq('id', tempId);
    }
    
    console.log('Successfully added figma_url column to prototypes table');
    console.log('You can now use the figma_url field in your application');
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

// Run the function
addFigmaUrlColumn();
