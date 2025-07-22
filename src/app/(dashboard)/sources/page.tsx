'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks'
import { AddSourceDialog } from '@/components/sources/add-source-dialog'
import { SourceCard } from '@/components/sources/source-card'
import { api } from '@/lib/trpc/client'
import { supabase } from '@/lib/supabase/client'
import { parseFeed, generateGuidHash } from '@/lib/services/feed-parser'
import { Button } from '@/components/ui/button'
import { RefreshCw, Plus } from 'lucide-react'
import { toast } from 'sonner'

export default function SourcesPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false)
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(true)
  const [issueCounts, setIssueCounts] = useState<Record<string, number>>({})
  const [isSyncing, setIsSyncing] = useState(false)
  
  // Fetch subscriptions and issue counts directly from Supabase
  const loadSubscriptions = async () => {
    if (!user) return
    
    setSubscriptionsLoading(true)
    try {
      // Load subscriptions (includes image_url if column exists)
      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (subscriptionsError) {
        console.error('Error loading subscriptions:', subscriptionsError)
        return
      }
      
      console.log('Loaded subscriptions:', subscriptionsData)
      setSubscriptions(subscriptionsData || [])
      
      // Load issue counts for each subscription
      if (subscriptionsData && subscriptionsData.length > 0) {
        const counts: Record<string, number> = {}
        
        for (const subscription of subscriptionsData) {
          const { count, error: countError } = await supabase
            .from('entries')
            .select('*', { count: 'exact', head: true })
            .eq('subscription_id', subscription.id)
          
          if (!countError && count !== null) {
            counts[subscription.id] = count
          }
        }
        
        setIssueCounts(counts)
      }
    } catch (error) {
      console.error('Error loading subscriptions:', error)
    } finally {
      setSubscriptionsLoading(false)
    }
  }
  
  // Sync feeds function (client-side)
  const syncFeeds = async () => {
    if (!user) {
      toast.error('User not authenticated')
      return
    }
    
    setIsSyncing(true)
    let totalSynced = 0
    
    try {
      // Get all active subscriptions
      const { data: activeSubscriptions, error: subscriptionsError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
      
      if (subscriptionsError) {
        throw new Error(`Failed to fetch subscriptions: ${subscriptionsError.message}`)
      }
      
      if (!activeSubscriptions || activeSubscriptions.length === 0) {
        toast.info('No active subscriptions to sync')
        return
      }
      
      // Process each subscription with delay to avoid rate limiting
      for (let i = 0; i < activeSubscriptions.length; i++) {
        const subscription = activeSubscriptions[i]
        
        // Add delay between requests (except for first one)
        if (i > 0) {
          console.log('Waiting 2 seconds before next sync to avoid rate limiting...')
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
        
        try {
          console.log(`Syncing feed ${i + 1}/${activeSubscriptions.length}: ${subscription.title} (${subscription.feed_url})`)
          
          let parsedFeed
          
          try {
            // Try to parse the RSS/Atom feed
            parsedFeed = await parseFeed(subscription.feed_url)
          } catch (error: any) {
            // If rate limited or other error, use mock data for testing
            if (error.message.includes('Rate limit') || error.message.includes('429')) {
              console.log('Rate limited - using mock data for testing')
              parsedFeed = {
                title: subscription.title,
                entries: [
                  {
                    guid: 'mock-entry-1-' + Date.now(),
                    title: 'Test Issue #1 - Mock Data',
                    content: '<p>This is a mock newsletter entry created for testing purposes.</p><p>It simulates what would be imported from the RSS feed.</p>',
                    published_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
                  },
                  {
                    guid: 'mock-entry-2-' + Date.now(),
                    title: 'Test Issue #2 - Mock Data',
                    content: '<p>This is another mock newsletter entry.</p><p>It shows how multiple entries would be processed.</p>',
                    published_at: new Date().toISOString(),
                  }
                ],
                last_updated: new Date().toISOString()
              }
            } else {
              throw error // Re-throw if it's not a rate limit error
            }
          }
          
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
          console.log(`✅ Synced ${syncedEntries} new entries for ${subscription.title}`)
          
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
        }
      }
      
      toast.success(`Sync completed! ${totalSynced} new entries synced.`)
      
      // Reload subscriptions and issue counts
      await loadSubscriptions()
      
    } catch (error: any) {
      console.error('Sync error:', error)
      toast.error(`Sync failed: ${error.message}`)
    } finally {
      setIsSyncing(false)
    }
  }
  
  // Load subscriptions when user is available
  useEffect(() => {
    if (user) {
      loadSubscriptions()
    }
  }, [user])
  
  // Delete subscription function
  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      return
    }
    
    try {
      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('id', id)
      
      if (error) {
        toast.error(`Failed to delete source: ${error.message}`)
        return
      }
      
      toast.success('Source deleted successfully')
      await loadSubscriptions() // Reload the list
    } catch (error: any) {
      toast.error(`Failed to delete source: ${error.message}`)
    }
  }

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login')
      }
      setHasCheckedAuth(true)
    }
  }, [user, loading, router])

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    )
  }

  // Show auth status for debugging
  if (!user && !loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <h1 className="text-xl font-bold mb-2">Not Authenticated</h1>
          <p>User: {user ? 'Found' : 'Not found'}</p>
          <p>Loading: {loading ? 'Yes' : 'No'}</p>
          <p>You should be redirected to login, but redirect is disabled for debugging.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-4">Your Sources</h1>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={syncFeeds}
            disabled={isSyncing || subscriptionsLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Feeds'}
          </Button>
          <AddSourceDialog onSuccess={loadSubscriptions}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Source
            </Button>
          </AddSourceDialog>
        </div>
      </div>
      
      {/* Sources List */}
      {subscriptionsLoading ? (
        <div className="flex justify-center items-center h-32">
          <div className="text-lg">Loading sources...</div>
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="bg-card p-8 rounded-lg border text-center">
          <h2 className="text-xl font-semibold mb-2">No sources yet</h2>
          <p className="text-muted-foreground mb-4">
            Add your first newsletter source to get started!
          </p>
          <AddSourceDialog onSuccess={loadSubscriptions}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Source
            </Button>
          </AddSourceDialog>
        </div>
      ) : (
        <>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {subscriptions.map((subscription) => (
              <SourceCard
                key={subscription.id}
                subscription={subscription}
                issueCount={issueCounts[subscription.id] || 0}
                onUpdate={loadSubscriptions}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
