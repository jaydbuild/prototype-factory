
export type FeedbackStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface FeedbackPoint {
  id: string;
  prototype_id: string;
  created_by: string;
  content: string;
  position: {
    x: number;
    y: number;
    width?: number;
    height?: number;
  };
  created_at: string;
  updated_at: string;
  status: FeedbackStatus;
}

export interface FeedbackReaction {
  id: string;
  prototype_id: string;
  feedback_id: string;
  created_by: string;
  reaction_type: string;
  created_at: string;
}

export interface FeedbackUser {
  id: string;
  name: string | null;
  avatar_url: string | null;
}
