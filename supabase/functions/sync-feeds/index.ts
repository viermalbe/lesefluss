import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FeedEntry {
  title: string
  content: string
  link: string
  pub_date: string
  guid: string
  image_url?: string
}

interface Subscription {
  id: string
  user_id: string
  feed_url: string
  title: string
  status: string
}

// Simple RSS/Atom parser for Deno
async function parseFeed(feedUrl: string): Promise<FeedEntry[]> {
  try {
    console.log(`Fetching feed: ${feedUrl}`)
    
    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Lesefluss/1.0 (Newsletter Reader)',
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml',
      },
      timeout: 30000, // 30 second timeout
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const xmlText = await response.text()
    
    // Basic XML parsing - in production, use a proper XML parser
    const entries: FeedEntry[] = []
    
    // Simple regex-based parsing (replace with proper XML parser in production)
    const itemMatches = xmlText.match(/<item[^>]*>[\s\S]*?<\/item>/gi) || 
                       xmlText.match(/<entry[^>]*>[\s\S]*?<\/entry>/gi) || []
    
    for (const itemXml of itemMatches.slice(0, 50)) { // Limit to 50 entries
      try {
        const title = extractXmlContent(itemXml, 'title') || 'Untitled'
        const content = extractXmlContent(itemXml, 'description') || 
                       extractXmlContent(itemXml, 'content') || 
                       extractXmlContent(itemXml, 'summary') || ''
        const link = extractXmlContent(itemXml, 'link') || ''
        const pubDate = extractXmlContent(itemXml, 'pubDate') || 
                       extractXmlContent(itemXml, 'published') || 
                       new Date().toISOString()
        const guid = extractXmlContent(itemXml, 'guid') || 
                    extractXmlContent(itemXml, 'id') || 
                    generateGuidHash(title, link, pubDate)
        
        // Extract image from content or enclosure
        let imageUrl = ''
        const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i)
        if (imgMatch) {
          imageUrl = imgMatch[1]
        }
        
        entries.push({
          title: cleanHtml(title),
          content: content,
          link: link,
          pub_date: new Date(pubDate).toISOString(),
          guid: guid,
          image_url: imageUrl || undefined,
        })
      } catch (error) {
        console.error('Error parsing item:', error)
      }
    }
    
    console.log(`Parsed ${entries.length} entries from ${feedUrl}`)
    return entries
    
  } catch (error) {
    console.error(`Error parsing feed ${feedUrl}:`, error)
    throw error
  }
}

function extractXmlContent(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')
  const match = xml.match(regex)
  return match ? match[1].trim() : ''
}

function cleanHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim()
}

function generateGuidHash(title: string, link: string, pubDate: string): string {
  const content = `${title}-${link}-${pubDate}`
  // Simple hash function for Deno
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36)
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== Supabase Edge Function: Feed Sync ===')
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Get all active subscriptions
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('status', 'active')
    
    if (subscriptionsError) {
      console.error('Error fetching subscriptions:', subscriptionsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch subscriptions' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    
    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active subscriptions found', synced: 0 }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    
    let totalSynced = 0
    const results = []
    
    // Process each subscription
    for (const subscription of subscriptions as Subscription[]) {
      try {
        console.log(`Processing subscription: ${subscription.title}`)
        
        const entries = await parseFeed(subscription.feed_url)
        let syncedCount = 0
        
        // Insert new entries
        for (const entry of entries) {
          try {
            const { error: insertError } = await supabase
              .from('entries')
              .insert({
                subscription_id: subscription.id,
                user_id: subscription.user_id,
                title: entry.title,
                content: entry.content,
                link: entry.link,
                pub_date: entry.pub_date,
                guid: entry.guid,
                image_url: entry.image_url,
                status: 'unread',
                starred: false,
              })
            
            if (!insertError) {
              syncedCount++
            } else if (insertError.code !== '23505') { // Ignore duplicate key errors
              console.error('Insert error:', insertError)
            }
          } catch (error) {
            console.error('Error inserting entry:', error)
          }
        }
        
        // Update subscription last_sync_at
        await supabase
          .from('subscriptions')
          .update({ 
            last_sync_at: new Date().toISOString(),
            last_error: null 
          })
          .eq('id', subscription.id)
        
        totalSynced += syncedCount
        results.push({
          subscription_id: subscription.id,
          title: subscription.title,
          synced: syncedCount,
          total_entries: entries.length
        })
        
        console.log(`Synced ${syncedCount}/${entries.length} entries for ${subscription.title}`)
        
      } catch (error) {
        console.error(`Error processing subscription ${subscription.id}:`, error)
        
        // Update subscription with error
        await supabase
          .from('subscriptions')
          .update({ 
            last_error: error.message,
            last_sync_at: new Date().toISOString()
          })
          .eq('id', subscription.id)
        
        results.push({
          subscription_id: subscription.id,
          title: subscription.title,
          error: error.message,
          synced: 0
        })
      }
    }
    
    console.log(`=== Sync completed: ${totalSynced} total entries synced ===`)
    
    return new Response(
      JSON.stringify({
        message: 'Feed sync completed',
        total_synced: totalSynced,
        subscriptions_processed: subscriptions.length,
        results: results
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
    
  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
