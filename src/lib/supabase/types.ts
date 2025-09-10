export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          onboarding_complete_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          onboarding_complete_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          onboarding_complete_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          title: string
          feed_url: string
          ktln_email: string | null
          status: 'active' | 'paused' | 'error'
          image_url: string | null
          last_sync_at: string | null
          sync_error: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          feed_url: string
          ktln_email?: string | null
          status?: 'active' | 'paused' | 'error'
          image_url?: string | null
          last_sync_at?: string | null
          sync_error?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          feed_url?: string
          ktln_email?: string | null
          status?: 'active' | 'paused' | 'error'
          image_url?: string | null
          last_sync_at?: string | null
          sync_error?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      entries: {
        Row: {
          id: string
          subscription_id: string
          guid_hash: string
          guid?: string | null
          title: string
          content_html: string
          link: string | null
          published_at: string
          status: 'unread' | 'read'
          starred: boolean
          archived: boolean
          created_at: string
        }
        Insert: {
          id?: string
          subscription_id: string
          guid_hash: string
          guid?: string | null
          title: string
          content_html: string
          link?: string | null
          published_at: string
          status?: 'unread' | 'read'
          starred?: boolean
          archived?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          subscription_id?: string
          guid_hash?: string
          guid?: string | null
          title?: string
          content_html?: string
          link?: string | null
          published_at?: string
          status?: 'unread' | 'read'
          starred?: boolean
          archived?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entries_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          }
        ]
      }
      sync_logs: {
        Row: {
          id: string
          subscription_id: string
          status: string
          message: string | null
          entries_added: number
          entries_updated: number
          created_at: string
        }
        Insert: {
          id?: string
          subscription_id: string
          status: string
          message?: string | null
          entries_added?: number
          entries_updated?: number
          created_at?: string
        }
        Update: {
          id?: string
          subscription_id?: string
          status?: string
          message?: string | null
          entries_added?: number
          entries_updated?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_logs_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      subscription_status: 'active' | 'paused' | 'error'
      entry_status: 'unread' | 'read'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
