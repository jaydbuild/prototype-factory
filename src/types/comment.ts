export type CommentStatus = 'open' | 'closed';

export interface CommentPosition {
  x: number;
  y: number;
}

export interface Comment {
  id: string;
  prototype_id: string;
  created_by: string;
  content: string;
  position: CommentPosition;
  status: CommentStatus;
  parent_id?: string;
  created_at: string;
  updated_at?: string;
  profiles?: {
    name: string;
    avatar_url?: string;
  };
}
