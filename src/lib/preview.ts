
import { getLinkPreview } from 'link-preview-js';

export async function fetchPreview(url: string) {
  try {
    const data = await getLinkPreview(url);
    
    // Handle the response based on its shape
    if ('title' in data || 'description' in data || 'images' in data) {
      return {
        title: 'title' in data ? data.title : '',
        description: 'description' in data ? data.description : '',
        image: 'images' in data && Array.isArray(data.images) && data.images.length > 0 ? data.images[0] : '',
        url: data.url,
      };
    }
    
    // Return default values if metadata is not available
    return {
      title: '',
      description: '',
      image: '',
      url: data.url,
    };
  } catch (error) {
    console.error('Error fetching link preview:', error);
    return null;
  }
}
