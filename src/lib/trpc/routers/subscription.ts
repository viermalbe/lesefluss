import { z } from 'zod'
import { createTRPCRouter, publicProcedure, protectedProcedure } from '../server'
import {
  subscriptionSchema,
  createSubscriptionSchema,
  updateSubscriptionSchema,
} from '@/lib/schemas'
import { createClient } from '@/lib/supabase/server'
import { KTLNService } from '@/lib/services/ktln'

export const subscriptionRouter = createTRPCRouter({
  // Get all subscriptions for the current user
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const supabase = await createClient()
    
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('User not authenticated')
      }
      
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch subscriptions: ${error.message}`)
      }

      return data || []
    } catch (error) {
      console.error('getAll subscriptions error:', error)
      throw error
    }
  }),

  // Get a single subscription by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      // TODO: Implement with Supabase
      // const { data, error } = await supabase
      //   .from('subscriptions')
      //   .select('*')
      //   .eq('id', input.id)
      //   .eq('user_id', ctx.user.id)
      //   .single()

      // Mock data for now
      return null
    }),

  // Create a new subscription
  create: protectedProcedure
    .input(createSubscriptionSchema)
    .mutation(async ({ input, ctx }) => {
      console.log('Creating subscription with input:', input)
      
      try {
        const supabase = await createClient()
        
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        console.log('Auth check result:', { user: !!user, error: userError })
        
        if (userError) {
          console.error('Supabase auth error:', userError)
          throw new Error(`Authentication error: ${userError.message}`)
        }
        
        if (!user) {
          throw new Error('User not authenticated - no session found')
        }
        
        // Create real KTLN subscription (server-side to avoid CORS)
        console.log('Creating KTLN newsletter for:', input.title)
        const ktlnResult = await KTLNService.createNewsletter(input.title)
        
        // Insert subscription into database
        const { data, error } = await supabase
          .from('subscriptions')
          .insert({
            user_id: user.id,
            title: input.title,
            feed_url: ktlnResult.feed,
            ktln_email: ktlnResult.email,
            status: 'active' as const,
          })
          .select()
          .single()
        
        if (error) {
          console.error('Supabase error:', error)
          throw new Error(`Failed to create subscription: ${error.message}`)
        }
        
        return data
      } catch (error) {
        console.error('Subscription creation error:', error)
        throw error
      }
    }),

  // Update a subscription
  update: protectedProcedure
    .input(updateSubscriptionSchema)
    .mutation(async ({ input, ctx }) => {
      const supabase = await createClient()
      
      const { data, error } = await supabase
        .from('subscriptions')
        .update({ 
          title: input.title,
          updated_at: new Date().toISOString() 
        })
        .eq('id', input.id)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update subscription: ${error.message}`)
      }
      
      return data
    }),

  // Delete a subscription
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const supabase = await createClient()
      
      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('id', input.id)

      if (error) {
        throw new Error(`Failed to delete subscription: ${error.message}`)
      }
      
      return { success: true }
    }),
})
