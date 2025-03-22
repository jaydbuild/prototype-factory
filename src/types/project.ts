
export interface Project {
  id: string;
  name: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  created_at: string;
}

export interface ProjectWithMemberCount extends Project {
  member_count: number;
  prototype_count: number;
  role?: 'owner' | 'editor' | 'viewer';
}
