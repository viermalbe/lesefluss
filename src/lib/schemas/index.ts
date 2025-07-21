import { z } from 'zod'

// User schemas
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  onboarding_complete_at: z.string().datetime().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

// Subscription schemas
export const subscriptionSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string().min(1).max(255),
  feed_url: z.string().url(),
  ktln_email: z.string().email(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export const createSubscriptionSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
})

export const updateSubscriptionSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(255).optional(),
})

// Entry schemas
export const entrySchema = z.object({
  id: z.string().uuid(),
  subscription_id: z.string().uuid(),
  guid_hash: z.string(),
  title: z.string(),
  content_html: z.string(),
  published_at: z.string().datetime(),
  status: z.enum(['unread', 'read']),
  starred: z.boolean(),
  archived: z.boolean(),
  created_at: z.string().datetime(),
})

export const updateEntryStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['unread', 'read']),
})

export const toggleEntryStarSchema = z.object({
  id: z.string().uuid(),
})

export const archiveEntrySchema = z.object({
  id: z.string().uuid(),
})

// Filter and pagination schemas
export const entryFiltersSchema = z.object({
  status: z.enum(['unread', 'read', 'all']).optional(),
  starred: z.boolean().optional(),
  subscription_id: z.string().uuid().optional(),
  search: z.string().optional(),
})

export const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
})

// API Response schema
export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: dataSchema.optional(),
    error: z.string().optional(),
    success: z.boolean(),
  })

// Export types
export type User = z.infer<typeof userSchema>
export type Subscription = z.infer<typeof subscriptionSchema>
export type CreateSubscription = z.infer<typeof createSubscriptionSchema>
export type UpdateSubscription = z.infer<typeof updateSubscriptionSchema>
export type Entry = z.infer<typeof entrySchema>
export type UpdateEntryStatus = z.infer<typeof updateEntryStatusSchema>
export type ToggleEntryStar = z.infer<typeof toggleEntryStarSchema>
export type ArchiveEntry = z.infer<typeof archiveEntrySchema>
export type EntryFilters = z.infer<typeof entryFiltersSchema>
export type Pagination = z.infer<typeof paginationSchema>
