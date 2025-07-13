import { createClient } from "@supabase/supabase-js"

const supabaseUrl = "https://fcnehpaubkdlepqcbdct.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjbmVocGF1YmtkbGVwcWNiZGN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwODY0NTksImV4cCI6MjA2NzY2MjQ1OX0.LRGWdlWHXYQjnlXoYbzU-NLiVKhiJe_1Nmt5UUq40OA"

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase configuration loaded from hardcoded values')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Database types for better TypeScript support
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          avatar_url: string | null
          provider: string | null
          provider_id: string | null
          last_sign_in_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          provider?: string | null
          provider_id?: string | null
          last_sign_in_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          provider?: string | null
          provider_id?: string | null
          last_sign_in_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      files: {
        Row: {
          id: string
          user_id: string | null
          filename: string
          original_name: string
          file_size: number
          mime_type: string
          storage_path: string
          unique_code: string
          latitude: number | null
          longitude: number | null
          expires_at: string | null
          is_downloaded: boolean
          ai_tags: string[] | null
          ai_summary: string | null
          ai_classification: string | null
          content_keywords: string[] | null
          sentiment_score: number | null
          processing_status: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          filename: string
          original_name: string
          file_size: number
          mime_type: string
          storage_path: string
          unique_code: string
          latitude?: number | null
          longitude?: number | null
          expires_at?: string | null
          is_downloaded?: boolean
          ai_tags?: string[] | null
          ai_summary?: string | null
          ai_classification?: string | null
          content_keywords?: string[] | null
          sentiment_score?: number | null
          processing_status?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          filename?: string
          original_name?: string
          file_size?: number
          mime_type?: string
          storage_path?: string
          unique_code?: string
          latitude?: number | null
          longitude?: number | null
          expires_at?: string | null
          is_downloaded?: boolean
          ai_tags?: string[] | null
          ai_summary?: string | null
          ai_classification?: string | null
          content_keywords?: string[] | null
          sentiment_score?: number | null
          processing_status?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      downloads: {
        Row: {
          id: string
          file_id: string
          user_id: string | null
          downloaded_at: string
        }
        Insert: {
          id?: string
          file_id: string
          user_id?: string | null
          downloaded_at?: string
        }
        Update: {
          id?: string
          file_id?: string
          user_id?: string | null
          downloaded_at?: string
        }
      }
      user_activity_logs: {
        Row: {
          id: string
          user_id: string | null
          activity_type: string
          file_id: string | null
          ip_address: string | null
          user_agent: string | null
          location_lat: number | null
          location_lng: number | null
          metadata: any | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          activity_type: string
          file_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          location_lat?: number | null
          location_lng?: number | null
          metadata?: any | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          activity_type?: string
          file_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          location_lat?: number | null
          location_lng?: number | null
          metadata?: any | null
          created_at?: string
        }
      }
      ml_insights: {
        Row: {
          id: string
          insight_type: string
          title: string
          description: string | null
          value: number | null
          metadata: any | null
          severity: string | null
          created_at: string
        }
        Insert: {
          id?: string
          insight_type: string
          title: string
          description?: string | null
          value?: number | null
          metadata?: any | null
          severity?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          insight_type?: string
          title?: string
          description?: string | null
          value?: number | null
          metadata?: any | null
          severity?: string | null
          created_at?: string
        }
      }
      anomalies: {
        Row: {
          id: string
          anomaly_type: string
          description: string | null
          severity: string | null
          file_id: string | null
          user_id: string | null
          metadata: any | null
          resolved: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          anomaly_type: string
          description?: string | null
          severity?: string | null
          file_id?: string | null
          user_id?: string | null
          metadata?: any | null
          resolved?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          anomaly_type?: string
          description?: string | null
          severity?: string | null
          file_id?: string | null
          user_id?: string | null
          metadata?: any | null
          resolved?: boolean | null
          created_at?: string
        }
      }
      search_queries: {
        Row: {
          id: string
          user_id: string | null
          query_text: string
          processed_intent: string | null
          extracted_keywords: string[] | null
          extracted_entities: string[] | null
          results_count: number | null
          response_time_ms: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          query_text: string
          processed_intent?: string | null
          extracted_keywords?: string[] | null
          extracted_entities?: string[] | null
          results_count?: number | null
          response_time_ms?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          query_text?: string
          processed_intent?: string | null
          extracted_keywords?: string[] | null
          extracted_entities?: string[] | null
          results_count?: number | null
          response_time_ms?: number | null
          created_at?: string
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