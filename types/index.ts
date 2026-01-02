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
      legislation: {
        Row: {
          id: string
          bill_id: string
          title: string
          url_slug: string
          markdown_body: string
          tldr: string | null
          seo_title: string | null
          meta_description: string | null
          origin_chamber: string | null
          type: string | null
          congress: number | null
          update_date: string | null
          sponsor_data: Json | null
          news_context: Json | null
          policy_research: Json | null
          congress_gov_url: string | null
          is_published: boolean
          created_at: string
        }
        Insert: {
          id?: string
          bill_id: string
          title: string
          url_slug: string
          markdown_body: string
          tldr?: string | null
          seo_title?: string | null
          meta_description?: string | null
          origin_chamber?: string | null
          type?: string | null
          congress?: number | null
          update_date?: string | null
          sponsor_data?: Json | null
          news_context?: Json | null
          policy_research?: Json | null
          congress_gov_url?: string | null
          is_published?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          bill_id?: string
          title?: string
          url_slug?: string
          markdown_body?: string
          tldr?: string | null
          seo_title?: string | null
          meta_description?: string | null
          origin_chamber?: string | null
          type?: string | null
          congress?: number | null
          update_date?: string | null
          sponsor_data?: Json | null
          news_context?: Json | null
          policy_research?: Json | null
          congress_gov_url?: string | null
          is_published?: boolean
          created_at?: string
        }
      }
    }
  }
}
