export type Prototype = {
  id: string;
  name: string;
  created_at: string;
  created_by: string;
  deployment_status: 'pending' | 'processing' | 'deployed' | 'failed';
  deployment_url: string | null;
  file_path?: string | null;
}
