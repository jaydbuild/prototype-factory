
export interface Database {
  public: {
    Tables: {
      comments: {
        Row: {
          id: string
          prototype_id: string
          created_by: string
          content: string
          position: { x: number; y: number }
          status: 'open' | 'resolved' | 'needs review'
          parent_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          prototype_id: string
          created_by: string
          content: string
          position: { x: number; y: number }
          status?: 'open' | 'resolved' | 'needs review'
          parent_id?: string | null
        }
        Update: Partial<Database['public']['Tables']['comments']['Insert']>
      }
    }
  }
}

export type Comment = Database['public']['Tables']['comments']['Row'];
