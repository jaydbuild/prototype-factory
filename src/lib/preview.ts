
import { getLinkPreview } from 'link-preview-js';

export async function fetchPreview(url: string) {
  try {
    const data = await getLinkPreview(url);
    return {
      title: data.title,
      description: data.description,
      image: data.images?.[0] || '',
      url: data.url,
    };
  } catch (error) {
    console.error('Error fetching link preview:', error);
    return null;
  }
}
