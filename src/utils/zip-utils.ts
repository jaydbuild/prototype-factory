import JSZip from 'jszip';

export async function validatePrototypeZip(file: File) {
  const zip = new JSZip();
  const content = await zip.loadAsync(file);

  // Check for index.html in any location (root or subdirectory)
  const hasIndex = Object.keys(content.files).some(filePath => {
    const normalizedPath = filePath.toLowerCase();
    // Check for both root level and subdirectory index.html
    return normalizedPath === 'index.html' || normalizedPath.endsWith('/index.html');
  });

  if (!hasIndex) {
    throw new Error('ZIP file must contain an index.html file (at root or in a subdirectory)');
  }

  return true;
}
