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
        console.log(`📰 Syncing feed: ${subscription.title}`)
        console.log(`🔗 Feed URL: ${subscription.feed_url}`)
        console.log(`📧 KTLN Email: ${subscription.ktln_email}`)
        
        // Validate feed URL format
        if (!subscription.feed_url || !subscription.feed_url.startsWith('http')) {
          throw new Error(`Invalid feed URL: ${subscription.feed_url}`)
        }
        
        // Parse the RSS/Atom feed
        // For cron jobs, we need to provide the base URL
        const baseUrl = isCronJob ? (process.env.APP_URL || 'https://lesefluss.vercel.app') : undefined
        console.log(`🌐 Using base URL: ${baseUrl || 'relative'}`)
        
        const parsedFeed = await parseFeed(subscription.feed_url, baseUrl)
        
        let syncedEntries = 0
        
        // Process each entry in the feed
        for (const feedEntry of parsedFeed.entries) {
          // Resolve a permalink for this entry
          const deriveFeedId = (feedUrl?: string | null) => {
            if (!feedUrl) return null
            const m = feedUrl.match(/\/feeds\/([^.\/]+)(?:\.xml)?$/)
            return m ? m[1] : null
          }
          const deriveEntryId = () => {
            // Prefer extracting from the entry's link if present
            const fromLink = (feedEntry.link || '').match(/\/entries\/([A-Za-z0-9_-]+)\.html/)
            if (fromLink) return fromLink[1]
            // Fallback: try to extract from GUID (KTLN Atom uses urn:kill-the-newsletter:{entryId})
            if (feedEntry.guid) {
              const m = String(feedEntry.guid).match(/([^:]+)$/)
              if (m) return m[1]
            }
            return null
          }
          const feedId = deriveFeedId(subscription.feed_url)
          const entryId = deriveEntryId()
          const derivedLink = feedId && entryId
            ? `https://kill-the-newsletter.com/feeds/${feedId}/entries/${entryId}.html`
            : null
          const resolvedLink = feedEntry.link || derivedLink || null
          // Generate a hash for the GUID to ensure uniqueness
          const guidHash = generateGuidHash(feedEntry.guid, feedEntry.published_at)
          
          // Check if entry already exists
          const { data: existingEntry } = await supabase
            .from('entries')
            .select('id, link')
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
                link: resolvedLink,
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
          } else if (!existingEntry.link && resolvedLink) {
            // Backfill missing link for existing row
            const { error: updateError } = await supabase
              .from('entries')
              .update({ link: resolvedLink })
              .eq('id', existingEntry.id)
            if (updateError) {
              console.warn('Backfill link update failed:', updateError.message)
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
        console.error(`❌ Error syncing ${subscription.title}:`, error)
        console.error(`🔗 Failed URL: ${subscription.feed_url}`)
        
        // Check if it's a KTLN feed that might not exist yet
        const isKTLNFeed = subscription.feed_url?.includes('kill-the-newsletter.com')
        const errorMessage = isKTLNFeed 
          ? `KTLN feed not accessible (${error.message}). Feed might not have received any emails yet.`
          : error.message
        
        // Update subscription with error
        await supabase
          .from('subscriptions')
          .update({
            last_sync_at: new Date().toISOString(),
            sync_error: errorMessage
          })
          .eq('id', subscription.id)
        
        results.push({
          subscription: subscription.title,
          feed_url: subscription.feed_url,
          error: errorMessage
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
