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
          keywords: Json | null
          schema_type: string | null
          origin_chamber: string | null
          type: string | null
          congress: number | null
          update_date: string | null
          introduced_date: string | null
          latest_action: Json | null
          sponsors: Json | null
          cosponsors: Json | null
          cosponsors_funds: Json | null
          sponsor_data: Json | null
          news_context: Json | null
          policy_research: Json | null
          congress_gov_url: string | null
          is_published: boolean
          created_at: string
          source: string | null          // 'federal' | 'state'
          state_code: string | null      // e.g. 'CA', 'NY' — null for federal
          status: string | null          // 'Introduced', 'Referred to Committee', etc.
          status_date: string | null
          status_changed_at: string | null
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
          keywords?: Json | null
          schema_type?: string | null
          origin_chamber?: string | null
          type?: string | null
          congress?: number | null
          update_date?: string | null
          introduced_date?: string | null
          latest_action?: Json | null
          sponsors?: Json | null
          cosponsors?: Json | null
          cosponsors_funds?: Json | null
          sponsor_data?: Json | null
          news_context?: Json | null
          policy_research?: Json | null
          congress_gov_url?: string | null
          is_published?: boolean
          created_at?: string
          source?: string | null
          state_code?: string | null
          status?: string | null
          status_date?: string | null
          status_changed_at?: string | null
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
          keywords?: Json | null
          schema_type?: string | null
          origin_chamber?: string | null
          type?: string | null
          congress?: number | null
          update_date?: string | null
          introduced_date?: string | null
          latest_action?: Json | null
          sponsors?: Json | null
          cosponsors?: Json | null
          cosponsors_funds?: Json | null
          sponsor_data?: Json | null
          news_context?: Json | null
          policy_research?: Json | null
          congress_gov_url?: string | null
          is_published?: boolean
          created_at?: string
          source?: string | null
          state_code?: string | null
          status?: string | null
          status_date?: string | null
          status_changed_at?: string | null
        }
      }
      subscribers: {
        Row: {
          id: string
          email: string
          org_goal: string | null
          state_focus: string | null
          preferences: Json | null
          subscription_source: string | null
          last_seen: string | null
          last_notified_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          org_goal?: string | null
          state_focus?: string | null
          preferences?: Json | null
          subscription_source?: string | null
          last_seen?: string | null
          last_notified_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          org_goal?: string | null
          state_focus?: string | null
          preferences?: Json | null
          subscription_source?: string | null
          last_seen?: string | null
          last_notified_id?: string | null
          created_at?: string
        }
      }
      bill_matches: {
        Row: {
          id: string
          subscriber_id: string
          legislation_id: string
          match_score: number
          summary: string | null
          why_it_matters: string | null
          implications: string | null
          notified: boolean
          created_at: string
        }
        Insert: {
          id?: string
          subscriber_id: string
          legislation_id: string
          match_score: number
          summary?: string | null
          why_it_matters?: string | null
          implications?: string | null
          notified?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          subscriber_id?: string
          legislation_id?: string
          match_score?: number
          summary?: string | null
          why_it_matters?: string | null
          implications?: string | null
          notified?: boolean
          created_at?: string
        }
      }
    }
      starred_bills: {
        Row: {
          id: string
          subscriber_id: string
          legislation_id: string
          has_update: boolean
          last_status: string | null
          created_at: string
        }
        Insert: {
          id?: string
          subscriber_id: string
          legislation_id: string
          has_update?: boolean
          last_status?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          subscriber_id?: string
          legislation_id?: string
          has_update?: boolean
          last_status?: string | null
          created_at?: string
        }
      }
    }
  }
}
