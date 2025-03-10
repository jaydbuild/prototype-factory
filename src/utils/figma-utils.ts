
/**
 * Utility functions for working with Figma URLs and embeds
 */

/**
 * Extracts the file key from a Figma URL
 * @param url The Figma URL to parse
 * @returns Object containing the file key and any errors
 */
export function extractFigmaFileKey(url: string): { 
  fileKey: string | null; 
  error: string | null;
} {
  if (!url) {
    return { fileKey: null, error: null };
  }
  
  try {
    const urlObj = new URL(url);
    
    // Validate it's a Figma URL
    if (urlObj.hostname !== 'www.figma.com' && urlObj.hostname !== 'figma.com') {
      return { fileKey: null, error: 'Not a valid Figma URL' };
    }
    
    // Extract file key from path
    const pathParts = urlObj.pathname.split('/');
    if (pathParts.length >= 3 && pathParts[1] === 'file') {
      return { fileKey: pathParts[2], error: null };
    } else {
      return { fileKey: null, error: 'Invalid Figma URL format. Use a URL like https://www.figma.com/file/FILEID/NAME' };
    }
  } catch (e) {
    return { fileKey: null, error: 'Invalid URL format' };
  }
}

/**
 * Generates the embed HTML for a Figma file
 * @param fileKey The Figma file key
 * @returns The HTML string for embedding
 */
export function generateFigmaEmbedHtml(fileKey: string): string {
  return `<iframe 
    style="border: 1px solid rgba(0, 0, 0, 0.1); width: 100%; height: 100%;" 
    src="https://www.figma.com/embed?embed_host=share&url=https://www.figma.com/file/${fileKey}" 
    allowfullscreen
  ></iframe>`;
}

/**
 * Checks if a string is a valid Figma URL
 * @param url The URL to check
 * @returns True if the URL is a valid Figma URL
 */
export function isValidFigmaUrl(url: string): boolean {
  const { fileKey, error } = extractFigmaFileKey(url);
  return !!fileKey && !error;
}
