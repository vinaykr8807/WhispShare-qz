import { createClient } from "@supabase/supabase-js"

const supabaseUrl = "https://fcnehpaubkdlepqcbdct.supabase.co"
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjbmVocGF1YmtkbGVwcWNiZGN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwODY0NTksImV4cCI6MjA2NzY2MjQ1OX0.LRGWdlWHXYQjnlXoYbzU-NLiVKhiJe_1Nmt5UUq40OA"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
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
    }
  }
}
