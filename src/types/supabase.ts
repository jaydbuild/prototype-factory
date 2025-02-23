export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          updated_at: string | null
          username: string | null
          avatar_url: string | null
          website: string | null
        }
        Insert: {
          id: string
          updated_at?: string | null
          username?: string | null
          avatar_url?: string | null
          website?: string | null
        }
        Update: {
          id?: string
          updated_at?: string | null
          username?: string | null
          avatar_url?: string | null
          website?: string | null
        }
      }
      prototypes: {
        Row: {
          id: string
          created_at: string
          name: string
          url: string | null
          created_by: string
          preview_url: string | null
          preview_title: string | null
          preview_description: string | null
          preview_image: string | null
          file_path: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          url?: string | null
          created_by?: string
          preview_url?: string | null
          preview_title?: string | null
          preview_description?: string | null
          preview_image?: string | null
          file_path?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          url?: string | null
          created_by?: string
          preview_url?: string | null
          preview_title?: string | null
          preview_description?: string | null
          preview_image?: string | null
          file_path?: string | null
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Prototype = {
  id: string;
  name: string;
  type: 'link' | 'file';
  url: string | null;
  file_path: string | null;
  deployment_url: string | null;
  deployment_status: 'pending' | 'deployed' | 'failed';
  created_at: string;
  updated_at: string;
};
