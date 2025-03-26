
export type FeedbackStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type DeviceType = 'desktop' | 'tablet' | 'mobile' | 'custom';

export interface ElementTarget {
  selector: string | null;
  xpath: string | null;
  metadata: {
    tagName?: string;
    text?: string;
    attributes?: Record<string, string>;
    elementType?: string;
    displayName?: string;
  } | null;
}

export interface DeviceInfo {
  type: DeviceType;
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape';
  scale?: number;
}

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
  updated_at: string | null;
  status: FeedbackStatus;
  element_target?: ElementTarget;
  device_info?: DeviceInfo;
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
