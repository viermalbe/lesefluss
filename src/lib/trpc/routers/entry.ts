import { z } from 'zod'
import { createTRPCRouter, publicProcedure, protectedProcedure } from '../server'
import {
  entrySchema,
  updateEntryStatusSchema,
  toggleEntryStarSchema,
  archiveEntrySchema,
  entryFiltersSchema,
  paginationSchema,
} from '@/lib/schemas'
import { createClient } from '@/lib/supabase/server'

export const entryRouter = createTRPCRouter({
  // Get entries with filtering and pagination
  getAll: protectedProcedure
    .input(
      z.object({
        filters: entryFiltersSchema.optional(),
        pagination: paginationSchema.optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const supabase = await createClient()
      
      // Build query with subscription join - RLS policies will handle user filtering
      let query = supabase
        .from('entries')
        .select(`
          *,
          subscription:subscriptions!inner(
            id,
            title,
            user_id,
            status
          )
        `)
        .eq('subscription.status', 'active') // Only show entries from active subscriptions (not paused or error)
      
      // Apply filters
      if (input.filters?.status && input.filters.status !== 'all') {
        query = query.eq('status', input.filters.status)
      }
      if (input.filters?.starred !== undefined) {
        query = query.eq('starred', input.filters.starred)
      }
      if (input.filters?.subscription_id) {
        query = query.eq('subscription_id', input.filters.subscription_id)
      }
      if (input.filters?.search) {
        query = query.ilike('title', `%${input.filters.search}%`)
      }
      
      // Apply pagination
      const page = input.pagination?.page || 1
      const limit = input.pagination?.limit || 20
      const offset = (page - 1) * limit
      
      const { data, error, count } = await query
        .range(offset, offset + limit - 1)
        .order('published_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch entries: ${error.message}`)
      }

      return {
        entries: data || [],
        hasMore: (data?.length || 0) === limit,
        total: count || 0,
      }
    }),

  // Get a single entry by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const supabase = await createClient()
      
      const { data, error } = await supabase
        .from('entries')
        .select(`
          *,
          subscription:subscriptions!inner(
            id,
            title,
            user_id
          )
        `)
        .eq('id', input.id)
        // Note: RLS policies will ensure user can only access their own entries
        .single()

      if (error) {
        throw new Error(`Failed to fetch entry: ${error.message}`)
      }

      return data
    }),

  // Mark entry as read
  markAsRead: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const supabase = await createClient()
      
      const { data, error } = await supabase
        .from('entries')
        .update({ status: 'read' })
        .eq('id', input.id)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to mark entry as read: ${error.message}`)
      }
      
      return data
    }),

  // Mark entry as unread
  markAsUnread: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const supabase = await createClient()
      
      const { data, error } = await supabase
        .from('entries')
        .update({ status: 'unread' })
        .eq('id', input.id)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to mark entry as unread: ${error.message}`)
      }
      
      return data
    }),

  // Update entry status (read/unread)
  updateStatus: protectedProcedure
    .input(updateEntryStatusSchema)
    .mutation(async ({ input, ctx }) => {
      const supabase = await createClient()
      
      const { data, error } = await supabase
        .from('entries')
        .update({ status: input.status })
        .eq('id', input.id)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update entry status: ${error.message}`)
      }
      
      return data
    }),

  // Toggle entry star status
  toggleStar: protectedProcedure
    .input(toggleEntryStarSchema)
    .mutation(async ({ input, ctx }) => {
      const supabase = await createClient()
      
      // First get current starred status
      const { data: entry, error: fetchError } = await supabase
        .from('entries')
        .select('starred')
        .eq('id', input.id)
        .single()

      if (fetchError) {
        throw new Error(`Failed to fetch entry: ${fetchError.message}`)
      }

      // Toggle starred status
      const { data, error } = await supabase
        .from('entries')
        .update({ starred: !entry.starred })
        .eq('id', input.id)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to toggle star: ${error.message}`)
      }
      
      return data
    }),

  // Archive entry
  archive: protectedProcedure
    .input(archiveEntrySchema)
    .mutation(async ({ input, ctx }) => {
      const supabase = await createClient()
      
      const { data, error } = await supabase
        .from('entries')
        .update({ archived: true })
        .eq('id', input.id)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to archive entry: ${error.message}`)
      }
      
      return data
    }),

  // Bulk mark as read
  markAllAsRead: protectedProcedure
    .input(
      z.object({
        subscription_id: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // TODO: Implement with Supabase
      // let query = supabase
      //   .from('entries')
      //   .update({ status: 'read' })
      //   .eq('status', 'unread')

      // if (input.subscription_id) {
      //   query = query.eq('subscription_id', input.subscription_id)
      // }

      // const { data, error } = await query

      console.log('Marking all as read:', input)
      return { success: true }
    }),
})
