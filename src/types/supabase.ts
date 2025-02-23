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
          description: string | null
          url: string
          preview_url: string | null
          user_id: string
          updated_at: string | null
          preview_title: string | null
          preview_description: string | null
          preview_image: string | null
          files_path: string | null
          deployment_status: 'pending' | 'deployed' | 'failed' | null
          deployment_url: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          description?: string | null
          url: string
          preview_url?: string | null
          user_id: string
          updated_at?: string | null
          preview_title?: string | null
          preview_description?: string | null
          preview_image?: string | null
          files_path?: string | null
          deployment_status?: 'pending' | 'deployed' | 'failed' | null
          deployment_url?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          description?: string | null
          url?: string
          preview_url?: string | null
          user_id?: string
          updated_at?: string | null
          preview_title?: string | null
          preview_description?: string | null
          preview_image?: string | null
          files_path?: string | null
          deployment_status?: 'pending' | 'deployed' | 'failed' | null
          deployment_url?: string | null
        }
      }
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Prototype = Database['public']['Tables']['prototypes']['Row'];
