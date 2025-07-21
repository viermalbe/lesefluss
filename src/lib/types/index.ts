// Core types for Lesefluss application

export interface User {
  id: string
  email: string
  onboarding_complete_at?: string
  created_at: string
  updated_at: string
}

export interface Subscription {
  id: string
  user_id: string
  title: string
  feed_url: string
  ktln_email: string
  created_at: string
  updated_at: string
}

export interface Entry {
  id: string
  subscription_id: string
  guid_hash: string
  title: string
  content_html: string
  published_at: string
  status: 'unread' | 'read'
  starred: boolean
  archived: boolean
  created_at: string
}

export interface SyncLog {
  id: string
  subscription_id: string
  fetched_at: string
  status_code: number
  error_msg?: string
}

// API Response types
export interface ApiResponse<T> {
  data?: T
  error?: string
  success: boolean
}

// Filter and pagination types
export interface EntryFilters {
  status?: 'unread' | 'read' | 'all'
  starred?: boolean
  subscription_id?: string
  search?: string
}

export interface PaginationParams {
  page: number
  limit: number
  cursor?: string
}
