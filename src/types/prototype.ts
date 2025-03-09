export type Prototype = {
  id: string;
  name: string;
  created_at: string;
  created_by: string;
  deployment_status: 'pending' | 'processing' | 'deployed' | 'failed';
  deployment_url: string | null;
  preview_url: string | null;
  preview_image: string | null;
  preview_title: string | null;
  preview_description: string | null;
  url: string;
  file_path: string | null;
  bundle_path: string | null;
  processed_at: string | null;
  status: string | null;
  sandbox_config: Record<string, unknown> | null;
  figma_url: string | null; // Added Figma URL field
}
