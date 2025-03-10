
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
