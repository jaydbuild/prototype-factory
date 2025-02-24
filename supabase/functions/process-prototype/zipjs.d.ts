declare module "https://deno.land/x/zipjs@v2.7.45/index.js" {
  interface UnzippedFile {
    name: string;
    content: Uint8Array;
  }

  export function unzip(buffer: Uint8Array): Promise<UnzippedFile[]>;
}
