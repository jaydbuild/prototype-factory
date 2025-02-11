
export type CommentStatus = 'open' | 'resolved' | 'needs review';

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
  parent_id?: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    name: string | null;
    avatar_url: string | null;
  } | null;
}

export interface CommentUpdate {
  content?: string;
  status?: CommentStatus;
}

export interface CommentFilter {
  status?: CommentStatus[];
  sortBy: 'newest' | 'oldest';
}
