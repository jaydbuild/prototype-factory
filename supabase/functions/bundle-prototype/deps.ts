// Re-export dependencies with their types
export { serve } from "https://deno.land/std@0.168.0/http/server.ts";
export { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
export * as esbuild from "https://deno.land/x/esbuild@v0.17.11/mod.js";

// Import zipjs classes - using validated ESM import
import { ZipReader, BlobReader, Uint8ArrayWriter } from "https://esm.sh/@zip.js/zip.js@2.7.45";

// Export common types
export type { UnzippedFile } from "../types/prototypes.ts";

// Create and export unzip utility
export async function unzip(data: Uint8Array): Promise<Array<{name: string, content: Uint8Array}>> {
  // Create a blob from the data
  const blob = new Blob([data]);
  
  // Create a zip reader
  const reader = new ZipReader(new BlobReader(blob));
  
  try {
    // Get entries
    const entries = await reader.getEntries();
    const results = [];

    // Process each entry
    for (const entry of entries) {
      const writer = new Uint8ArrayWriter();
      const content = await entry.getData(writer);
      results.push({
        name: entry.filename,
        content
      });
    }

    return results;
  } finally {
    // Always close the reader
    await reader.close();
  }
}
