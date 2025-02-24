/// <reference lib="deno.ns" />
/// <reference lib="deno.window" />

declare module "https://deno.land/std@0.168.0/http/server.ts" {
  export { serve } from "std/http/server.ts";
}

declare module "https://esm.sh/@supabase/supabase-js@2.7.1" {
  export { createClient } from "supabase";
}

declare module "https://deno.land/x/esbuild@v0.17.11/mod.js" {
  export * from "esbuild";
}

declare module "https://deno.land/x/zipjs@v2.7.45/index.js" {
  export { unzip } from "zipjs";
}

// Add Deno global types
declare const Deno: {
  env: {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
  };
  [key: string]: any;
};
