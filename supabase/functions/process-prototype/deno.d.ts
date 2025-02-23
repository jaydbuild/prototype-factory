declare namespace Deno {
  export interface Env {
    get(key: string): string | undefined;
  }
  export const env: Env;
  export function makeTempDir(): Promise<string>;
  export function writeFile(path: string, data: Uint8Array): Promise<void>;
  export function readFile(path: string): Promise<Uint8Array>;
  export function remove(path: string, options?: { recursive?: boolean }): Promise<void>;
  export function readDir(path: string): AsyncIterable<{
    name: string;
    isFile: boolean;
    isDirectory: boolean;
  }>;
}

declare module "https://deno.land/std@0.168.0/http/server.ts" {
  export function serve(handler: (req: Request) => Promise<Response>): void;
}

declare module "https://esm.sh/@supabase/supabase-js@2" {
  export * from "@supabase/supabase-js";
}

declare module "https://deno.land/x/zipjs/index.js" {
  export function extract(data: Blob, options: { dir: string }): Promise<void>;
}

declare module "https://deno.land/std@0.168.0/path/mod.ts" {
  export function join(...paths: string[]): string;
}
