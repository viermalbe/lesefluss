import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { parseFeed, generateGuidHash } from '@/lib/services/feed-parser-server'

export async function POST(request: NextRequest) {
  try {
    console.log('=== Feed Sync API ===')
    
    // Check if this is a cron job call (has service role authorization)
    const authHeader = request.headers.get('authorization')
    console.log('Authorization header:', authHeader ? `Bearer ${authHeader.substring(0, 20)}...` : 'None')
    console.log('Service role key available:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
    
    // Check if the authorization header contains the service role key
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const isCronJob = authHeader && serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`
    
    console.log('Is cron job:', isCronJob)
    
    let supabase
    let targetUserId: string | null = null
    
    if (isCronJob) {
      // Use service role client for cron jobs
      console.log('✅ Cron job detected - using service role')
      supabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
    } else {
      // Use regular client for user requests
      console.log('👤 User request - using regular client')
      supabase = await createClient()
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        console.error('Auth error:', userError)
        return NextResponse.json(
          { error: 'User not authenticated' },
          { status: 401 }
        )
      }
      
      targetUserId = user.id
      console.log('User ID:', targetUserId)
    }
    
    // Get all active subscriptions (for specific user or all users in cron mode)
    console.log('📋 Fetching subscriptions...')
    console.log('Target user ID:', targetUserId || 'ALL USERS (cron mode)')
    
    const subscriptionsQuery = supabase
      .from('subscriptions')
      .select('*')
      .eq('status', 'active')
    
    if (targetUserId) {
      subscriptionsQuery.eq('user_id', targetUserId)
    }
    
    const { data: subscriptions, error: subscriptionsError } = await subscriptionsQuery
    
    console.log('Subscriptions query result:', {
      count: subscriptions?.length || 0,
      error: subscriptionsError
    })
    
    if (subscriptionsError) {
      console.error('❌ Error fetching subscriptions:', subscriptionsError)
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions', details: subscriptionsError },
        { status: 500 }
      )
    }
    
    if (!subscriptions || subscriptions.length === 0) {
      console.log('⚠️ No active subscriptions found')
      return NextResponse.json({
        message: 'No active subscriptions found',
        synced: 0,
        subscriptions_processed: 0
      })
    }
    
    console.log(`📊 Found ${subscriptions.length} active subscriptions`)
    
    let totalSynced = 0
    const results = []
    
    // Process each subscription
    for (const subscription of subscriptions) {
      try {
        console.log(`Syncing feed: ${subscription.title} (${subscription.feed_url})`)
        
        // Parse the RSS/Atom feed
        // For cron jobs, we need to provide the base URL
        const baseUrl = isCronJob ? process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000' : undefined
        const parsedFeed = await parseFeed(subscription.feed_url, baseUrl)
        
        let syncedEntries = 0
        
        // Process each entry in the feed
        for (const feedEntry of parsedFeed.entries) {
          // Generate a hash for the GUID to ensure uniqueness
          const guidHash = generateGuidHash(feedEntry.guid, feedEntry.published_at)
          
          // Check if entry already exists
          const { data: existingEntry } = await supabase
            .from('entries')
            .select('id')
            .eq('guid_hash', guidHash)
            .eq('subscription_id', subscription.id)
            .single()
          
          if (!existingEntry) {
            // Insert new entry
            const { error: insertError } = await supabase
              .from('entries')
              .insert({
                subscription_id: subscription.id,
                guid_hash: guidHash,
                title: feedEntry.title,
                content_html: feedEntry.content,
                published_at: feedEntry.published_at,
                status: 'unread',
                starred: false,
                archived: false
              })
            
            if (insertError) {
              console.error(`Error inserting entry: ${insertError.message}`)
            } else {
              syncedEntries++
            }
          }
        }
        
        // Update subscription sync status
        await supabase
          .from('subscriptions')
          .update({
            last_sync_at: new Date().toISOString(),
            sync_error: null
          })
          .eq('id', subscription.id)
        
        totalSynced += syncedEntries
        results.push({
          subscription: subscription.title,
          entries_synced: syncedEntries,
          total_entries: parsedFeed.entries.length
        })
        
        console.log(`Synced ${syncedEntries} new entries for ${subscription.title}`)
        
      } catch (error: any) {
        console.error(`Error syncing ${subscription.title}:`, error)
        
        // Update subscription with error
        await supabase
          .from('subscriptions')
          .update({
            last_sync_at: new Date().toISOString(),
            sync_error: error.message
          })
          .eq('id', subscription.id)
        
        results.push({
          subscription: subscription.title,
          error: error.message
        })
      }
    }
    
    console.log(`✅ Sync completed: ${totalSynced} entries across ${subscriptions.length} subscriptions`)
    
    return NextResponse.json({
      message: `Sync completed. ${totalSynced} new entries synced.`,
      total_synced: totalSynced,
      subscriptions_processed: subscriptions.length,
      results
    })
    
  } catch (error: any) {
    console.error('Feed sync error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
