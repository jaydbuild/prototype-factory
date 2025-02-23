
export type Prototype = {
  id: string;
  name: string;
  created_at: string;
  created_by: string;
  url?: string;
  preview_url?: string | null;
  preview_title?: string | null;
  preview_description?: string | null;
  preview_image?: string | null;
  deployment_status?: 'pending' | 'deployed' | 'failed';
  deployment_url?: string | null;
  file_path?: string | null;
}
