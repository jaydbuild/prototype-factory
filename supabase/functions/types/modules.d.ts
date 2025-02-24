declare module "https://*" {
  const content: any;
  export default content;
  export * from content;
}

declare module "std/http/server.ts" {
  export interface ServeInit {
    port?: number;
    hostname?: string;
  }
  
  export type Handler = (request: Request) => Response | Promise<Response>;
  
  export function serve(handler: Handler, init?: ServeInit): void;
}

declare module "@supabase/supabase-js" {
  export interface SupabaseClient {
    from: (table: string) => any;
    storage: {
      from: (bucket: string) => any;
    };
  }

  export function createClient(url: string, key: string): SupabaseClient;
}

declare module "esbuild" {
  export interface BuildOptions {
    stdin?: {
      contents: string;
      loader?: string;
    };
    bundle?: boolean;
    minify?: boolean;
    format?: string;
    write?: boolean;
  }

  export interface BuildResult {
    outputFiles: Array<{
      text: string;
    }>;
  }

  export function build(options: BuildOptions): Promise<BuildResult>;
}

declare module "zipjs" {
  export function unzip(data: Uint8Array): Promise<Array<{
    name: string;
    content: Uint8Array;
  }>>;
}
