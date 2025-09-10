'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SourceSettingsModal } from './source-settings-modal'
import { OptimizedImage } from '@/components/ui/optimized-image'
import { 
  Settings,
  ExternalLink,
  Filter,
  BarChart3,
  Calendar,
  Clock,
  Image as ImageIcon,
  RefreshCw
} from 'lucide-react'
import { getRelativeTime } from '@/lib/utils/content-utils'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { parseFeed, generateGuidHash } from '@/lib/services/feed-parser'

interface SourceCardProps {
  subscription: {
    id: string
    title: string
    ktln_email: string
    feed_url: string
    status: 'active' | 'paused' | 'error'
    created_at: string
    user_id: string
    image_url?: string | null
  }
  issueCount?: number
  latestIssueDate?: string
  weeklyAverage?: number
  onUpdate: () => void
  onDelete: (id: string, title: string) => void
}

interface SourceStats {
  totalIssues: number
  weeklyAverage: number
  lastIssueDate: string | null
  description: string | null
  websiteUrl: string | null
}

export function SourceCard({ subscription, issueCount = 0, latestIssueDate, weeklyAverage = 0, onUpdate, onDelete }: SourceCardProps) {
  const router = useRouter()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  // Use props directly instead of loading stats separately (performance optimization)
  const [stats, setStats] = useState<SourceStats>({
    totalIssues: issueCount,
    weeklyAverage: weeklyAverage,
    lastIssueDate: latestIssueDate || null,
    description: null,
    websiteUrl: null
  })
  const [isLoadingStats, setIsLoadingStats] = useState(false) // No longer loading
  
  // Update stats when props change
  useEffect(() => {
    setStats(prev => ({
      ...prev,
      totalIssues: issueCount,
      weeklyAverage: weeklyAverage,
      lastIssueDate: latestIssueDate || null
    }))
  }, [issueCount, latestIssueDate, weeklyAverage])

  const handleFilterBySource = () => {
    // Navigate to Issues page with source filter and reset other filters
    const params = new URLSearchParams()
    params.set('source', subscription.title)
    // Reset status filter to 'all' to show all issues
    params.set('status', 'all')
    router.push(`/issues?${params.toString()}`)
  }

  const handleToggleStatus = async () => {
    const newStatus = subscription.status === 'active' ? 'paused' : 'active'
    
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: newStatus })
        .eq('id', subscription.id)

      if (error) {
        toast.error(`Failed to ${newStatus === 'active' ? 'activate' : 'pause'} source: ${error.message}`)
        return
      }

      toast.success(`Source ${newStatus === 'active' ? 'activated' : 'paused'} successfully`)
      onUpdate()
    } catch (error: any) {
      toast.error(`Failed to update status: ${error.message}`)
    }
  }

  const handleOpenLatestIssue = async () => {
    try {
      // Load latest entry (basic fields only so it works on all schemas)
      let { data: latestEntry, error } = await supabase
        .from('entries')
        .select('id, guid, published_at')
        .eq('subscription_id', subscription.id)
        .order('published_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      // Fallback: if nothing returned, try created_at ordering (some feeds lack published_at)
      if (error || !latestEntry) {
        const fb = await supabase
          .from('entries')
          .select('id, guid, published_at, created_at')
          .eq('subscription_id', subscription.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        latestEntry = fb.data as any
      }

      if (!latestEntry) {
        console.debug('DB lookup for latest entry failed or returned none. Falling back to parsing feed.', { error })
        // Feed fallback
        const parsed = await parseFeed(subscription.feed_url)
        const items = (parsed.entries || []).sort((a: any, b: any) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())
        const first = items[0]
        if (!first) {
          // As a final fallback, navigate to Issues filtered by this source
          router.push(`/issues?source=${encodeURIComponent(subscription.title)}&filter=all`)
          return
        }
        const feedIdMatch = String(subscription.feed_url || '').match(/\/feeds\/([^.\/]+)(?:\.xml)?$/)
        const feedId = feedIdMatch ? feedIdMatch[1] : null
        const guidMatch = String(first.guid || '').match(/([^:]+)$/)
        const entryId = guidMatch ? guidMatch[1] : null
        const derived = feedId && entryId ? `https://kill-the-newsletter.com/feeds/${feedId}/entries/${entryId}.html` : null
        const external = first.link || derived
        if (external) {
          window.open(external, '_blank', 'noopener,noreferrer')
          return
        }
        // Final fallback: navigate to Issues filtered by this source
        router.push(`/issues?source=${encodeURIComponent(subscription.title)}&filter=all`)
        return
      }

      // Try to fetch link in a separate call (schema-safe)
      let directLink: string | null | undefined = null
      try {
        const { data: linkRow } = await supabase
          .from('entries')
          .select('link')
          .eq('id', latestEntry.id)
          .maybeSingle()
        directLink = (linkRow as any)?.link
      } catch (_) {
        // ignore if column doesn't exist
      }
      if (directLink) {
        const w = window.open(directLink, '_blank', 'noopener,noreferrer')
        if (!w) router.push(`/issues/${latestEntry.id}`)
        return
      }

      // Derive KTLN link if it's a KTLN feed
      const feedIdMatch = String(subscription.feed_url || '').match(/\/feeds\/([^.\/]+)(?:\.xml)?$/)
      const feedId = feedIdMatch ? feedIdMatch[1] : null
      const guidMatch = String((latestEntry as any).guid || '').match(/([^:]+)$/)
      const entryId = guidMatch ? guidMatch[1] : null
      const derived = feedId && entryId ? `https://kill-the-newsletter.com/feeds/${feedId}/entries/${entryId}.html` : null
      if (derived) {
        const w = window.open(derived, '_blank', 'noopener,noreferrer')
        if (!w) router.push(`/issues/${latestEntry.id}`)
        return
      }

      // Fallback to in-app detail page
      router.push(`/issues/${latestEntry.id}`)
    } catch (error: any) {
      toast.error('Failed to open latest issue')
    }
  }

  const getStatusColor = () => {
    switch (subscription.status) {
      case 'active': return 'bg-green-500'
      case 'paused': return 'bg-rose-500'
      case 'error': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const isPaused = subscription.status === 'paused'
  const [syncing, setSyncing] = useState(false)

  return (
    <>
      <Card className={`py-6 overflow-hidden ${
        isPaused ? 'border-primary' : 'border-border'
      }`}>
        <CardContent className="">
          {/* Header with Cover Image and Title */}
          <div className="flex items-start gap-4 mb-4">
            {/* Cover Image - Not clickable anymore */}
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                <OptimizedImage 
                  src={subscription.image_url}
                  alt={subscription.title}
                  className="w-full h-full object-contain bg-white"
                  sourceId={subscription.id}
                  fallbackIcon={<ImageIcon className="h-8 w-8 text-muted-foreground/70" />}
                />
              </div>
            </div>

            {/* Title and Status */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-card-foreground truncate">
                    {subscription.title}
                  </h3>
                  {/* Status - Clickable */}
                  <button
                    onClick={handleToggleStatus}
                    className={`text-sm font-medium rounded-md px-1 py-0.5 transition-colors ${
                      subscription.status === 'active' ? 'text-green-600 hover:text-green-700 dark:text-green-500 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/30' :
                      subscription.status === 'paused' ? 'text-rose-600 hover:text-rose-700 dark:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30' :
                      'text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30'
                    }`}
                  >
                    {subscription.status === 'active' ? 'Active' :
                     subscription.status === 'paused' ? 'Paused' :
                     '● Error'}
                  </button>
                </div>
                
                {/* Sync newer (left) and Settings Button (right) */}
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      if (syncing) return
                      setSyncing(true)
                      try {
                        const parsed = await parseFeed(subscription.feed_url)
                        const entries = parsed.entries || []

                        // Determine cutoff = latest stored published_at
                        const { data: latestStored } = await supabase
                          .from('entries')
                          .select('published_at')
                          .eq('subscription_id', subscription.id)
                          .order('published_at', { ascending: false, nullsFirst: false })
                          .limit(1)
                          .maybeSingle()
                        const cutoff = latestStored?.published_at ? new Date(latestStored.published_at).getTime() : null

                        // Preload existing guid_hashes to avoid duplicates
                        const { data: existingRows, error: existingErr } = await supabase
                          .from('entries')
                          .select('guid_hash')
                          .eq('subscription_id', subscription.id)
                        if (existingErr) throw new Error(existingErr.message)
                        const existing = new Set<string>((existingRows || []).map((r: any) => r.guid_hash))

                        let inserted = 0
                        // Process from oldest to newest to maintain order; only items newer than cutoff
                        const sorted = [...entries].sort((a: any, b: any) => new Date(a.published_at).getTime() - new Date(b.published_at).getTime())
                        for (const item of sorted) {
                          const guidHash = generateGuidHash(item.guid, item.published_at)
                          if (existing.has(guidHash)) continue
                          const publishedTs = new Date(item.published_at).getTime()
                          if (cutoff !== null && !(publishedTs > cutoff)) continue

                          // Build link if available (generic first, KTLN fallback)
                          const fromLink = (item.link || '').match(/\/entries\/([A-Za-z0-9_-]+)\.html/)
                          const feedIdMatch = String(subscription.feed_url || '').match(/\/feeds\/([^.\/]+)(?:\.xml)?$/)
                          const guidMatch = String(item.guid || '').match(/([^:]+)$/)
                          const entryId = fromLink ? fromLink[1] : (guidMatch ? guidMatch[1] : null)
                          const feedId = feedIdMatch ? feedIdMatch[1] : null
                          const derivedLink = feedId && entryId ? `https://kill-the-newsletter.com/feeds/${feedId}/entries/${entryId}.html` : null
                          const link = item.link || derivedLink || null

                          // Try insert with link column, fallback without if needed
                          const attempt = await supabase
                            .from('entries')
                            .insert({
                              subscription_id: subscription.id,
                              guid_hash: guidHash,
                              title: item.title,
                              content_html: item.content,
                              // @ts-ignore optional column
                              link,
                              published_at: item.published_at,
                              status: 'unread',
                              starred: false,
                              archived: false
                            })
                          if (attempt.error) {
                            const retry = await supabase
                              .from('entries')
                              .insert({
                                subscription_id: subscription.id,
                                guid_hash: guidHash,
                                title: item.title,
                                content_html: item.content,
                                published_at: item.published_at,
                                status: 'unread',
                                starred: false,
                                archived: false
                              })
                            if (retry.error) throw new Error(retry.error.message)
                          }
                          inserted++
                          existing.add(guidHash)
                        }
                        toast.success(inserted > 0 ? `Synced ${inserted} new entr${inserted === 1 ? 'y' : 'ies'}` : 'No new entries')
                        onUpdate()
                      } catch (e: any) {
                        toast.error(`Sync failed: ${e?.message || 'unknown error'}`)
                      } finally {
                        setSyncing(false)
                      }
                    }}
                    className="opacity-60 hover:opacity-100 transition-opacity"
                    title="Sync newer entries"
                  >
                    <RefreshCw className={`h-5 w-5 ${syncing ? 'animate-spin' : ''}`} />
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsSettingsOpen(true)}
                    className="opacity-60 hover:opacity-100 transition-opacity"
                    title="Settings"
                  >
                    <Settings className="h-6 w-6" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Statistics Row - 3 columns */}
          <div className="flex items-center justify-between text-sm">
            {/* Issues Count - Clickable */}
            <button
              onClick={handleFilterBySource}
              className="flex items-center gap-2 text-foreground hover:text-primary transition-colors rounded-md px-2 py-1 -mx-2 -my-1 hover:bg-primary/10"
            >
              <BarChart3 className="h-4 w-4 text-muted-foreground transition-colors" />
              <div>
                <span className="font-medium">{stats.totalIssues}</span>
                <span className="text-muted-foreground ml-1 transition-colors">Issues</span>
              </div>
            </button>
            
            {/* Weekly Average */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <span className="font-medium">{stats.weeklyAverage}</span>
                <span className="text-muted-foreground ml-1">/week</span>
              </div>
            </div>
            
            {/* Last Issue - Clickable */}
            {stats.lastIssueDate && (
              <button
                onClick={handleOpenLatestIssue}
                className="flex items-center gap-2 text-foreground hover:text-primary transition-colors rounded-md px-2 py-1 -mx-2 -my-1 hover:bg-primary/10"
              >
                <Clock className="h-4 w-4 text-muted-foreground transition-colors" />
                <span className="text-muted-foreground transition-colors">
                  {getRelativeTime(stats.lastIssueDate)}
                </span>
              </button>
            )}
          </div>

          {/* Description (if available) */}
          {stats.description && (
            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
              {stats.description}
            </p>
          )}

          {/* No action buttons - functionality moved to clickable elements */}
        </CardContent>
      </Card>

      {/* Settings Modal */}
      <SourceSettingsModal
        subscription={subscription}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onUpdate={() => {
          onUpdate() // Parent component will provide updated stats
        }}
        onDelete={onDelete}
      />
    </>
  )
}
