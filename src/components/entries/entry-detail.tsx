'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Calendar, Heart, Archive } from 'lucide-react'
import { sanitizeHtml } from '@/lib/utils/sanitize-html'
import { getRelativeTime } from '@/lib/utils/content-utils'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useAuth } from '@/lib/hooks'

interface EntryDetailProps {
  entryId: string
}

/**
 * Detailed view of a newsletter entry with full HTML content rendering
 * Includes read status management and safe HTML sanitization
 */
export function EntryDetail({ entryId }: EntryDetailProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [sanitizedContent, setSanitizedContent] = useState<string>('')
  const [entry, setEntry] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch entry by ID and automatically mark as read
  const fetchEntry = async () => {
    if (!user) return
    
    setIsLoading(true)
    try {
      const { data, error } = await supabase
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
        .eq('id', entryId)
        .eq('subscription.user_id', user.id)
        .single()
      
      if (error) {
        console.error('Error fetching entry:', error)
        setError('Failed to load entry')
        return
      }

      if (!data) {
        setError('Entry not found')
        return
      }

      setEntry(data)
      
      // Sanitize HTML content
      if (data.content_html) {
        const sanitized = sanitizeHtml(data.content_html)
        setSanitizedContent(sanitized)
      }

      // Automatically mark as read if it's unread
      if (data.status === 'unread') {
        await markAsReadAutomatically(data.id)
      }
    } catch (err) {
      console.error('Error in fetchEntry:', err)
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  // Automatically mark entry as read (silent, no toast)
  const markAsReadAutomatically = async (entryId: string) => {
    try {
      const { error } = await supabase
        .from('entries')
        .update({ status: 'read' })
        .eq('id', entryId)
      
      if (!error) {
        // Update local state
        setEntry((prev: any) => prev ? { ...prev, status: 'read' } : null)
      }
    } catch (err) {
      // Silent fail - don't show error for auto-read
      console.log('Auto-read failed:', err)
    }
  }

  // Toggle read status
  const toggleReadStatus = async () => {
    if (!entry) return
    
    const newStatus = entry.status === 'read' ? 'unread' : 'read'
    
    const { error } = await supabase
      .from('entries')
      .update({ status: newStatus })
      .eq('id', entryId)
    
    if (error) {
      console.error('Error updating entry status:', error)
      toast.error('Fehler beim Aktualisieren des Status')
      return
    }
    
    setEntry((prev: any) => ({ ...prev, status: newStatus }))
    toast.success(newStatus === 'read' ? 'Als geöffnet markiert' : 'Als neu markiert')
  }

  // Toggle starred status
  const toggleStarredStatus = async () => {
    if (!entry) return
    
    const newStarred = !entry.starred
    
    const { error } = await supabase
      .from('entries')
      .update({ starred: newStarred })
      .eq('id', entryId)
    
    if (error) {
      console.error('Error updating starred status:', error)
      toast.error('Fehler beim Aktualisieren der Favoriten')
      return
    }
    
    setEntry((prev: any) => ({ ...prev, starred: newStarred }))
    toast.success(newStarred ? 'Zu Favoriten hinzugefügt' : 'Aus Favoriten entfernt')
  }

  // Toggle archived status
  const toggleArchivedStatus = async () => {
    if (!entry) return
    
    const newArchived = !entry.archived
    
    const { error } = await supabase
      .from('entries')
      .update({ archived: newArchived })
      .eq('id', entryId)
    
    if (error) {
      console.error('Error updating archived status:', error)
      toast.error('Fehler beim Archivieren')
      return
    }
    
    setEntry((prev: any) => ({ ...prev, archived: newArchived }))
    toast.success(newArchived ? 'Archiviert' : 'Aus Archiv entfernt')
    
    // Navigate back to previous page after archiving (not unarchiving)
    if (newArchived) {
      setTimeout(() => {
        router.back()
      }, 500) // Small delay to show the success toast
    }
  }

  // Fetch entry on mount
  useEffect(() => {
    if (user) {
      fetchEntry()
    }
  }, [user, entryId])

  // Sanitize HTML content on client-side
  useEffect(() => {
    if (entry?.content_html && typeof window !== 'undefined') {
      setSanitizedContent(sanitizeHtml(entry.content_html))
    }
  }, [entry?.content_html])



  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (error || !entry) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto">
          <div className="sm:p-6">
            <div className="sm:bg-card sm:border sm:rounded-lg sm:shadow-sm">
              <div className="p-4 sm:p-6 border-b">
                <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </div>
              <div className="p-4 sm:p-6">
                <div className="text-center py-12">
                  <h2 className="text-xl font-semibold mb-2">Entry not found</h2>
                  <p className="text-muted-foreground mb-4">
                    The requested newsletter entry could not be loaded.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile-optimized container */}
      <div className="max-w-4xl mx-auto">
        {/* Entry content - Mobile: no card, Desktop: with card */}
        <div className="sm:p-6">
          {/* Mobile: Direct content, Desktop: Card wrapper */}
          <div className="sm:bg-card sm:border sm:rounded-lg sm:shadow-sm">
            {/* Integrated Header with Back Button */}
            <div className="p-4 sm:p-6 border-b">
              <div className="space-y-4">
                {/* Back Button and Time with Like - Inline */}
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <div className="flex items-center gap-3">

                    <div className="flex items-center gap-1">
                      {/* Archive Button */}
                      <button
                        onClick={toggleArchivedStatus}
                        className={`p-1 rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 ${
                          entry.archived ? 'text-black' : 'text-gray-400'
                        }`}
                        title={entry.archived ? 'Aus Archiv entfernen' : 'Archivieren'}
                      >
                        <Archive className={`w-4 h-4 ${
                          entry.archived ? 'fill-current' : ''
                        }`} />
                      </button>
                      {/* Like Button */}
                      <button
                        onClick={toggleStarredStatus}
                        className={`p-1 rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 ${
                          entry.starred ? 'text-red-500' : 'text-gray-400'
                        }`}
                        title={entry.starred ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
                      >
                        <Heart className={`w-4 h-4 ${
                          entry.starred ? 'fill-current' : ''
                        }`} />
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Title and Source */}
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">
                  {entry.title}
                </h1>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{entry.subscription.title}</span>
                  <span className="text-gray-500">•</span>
                  <span>{getRelativeTime(entry.published_at || entry.created_at)}</span>
                </div>
                
              </div>
            </div>
            
            {/* Content section */}
            <div className="p-4 sm:p-6">
              {sanitizedContent ? (
                <div 
                  className="newsletter-content prose prose-gray dark:prose-invert max-w-none prose-sm sm:prose-base"
                  dangerouslySetInnerHTML={{ __html: sanitizedContent }}
                  style={{
                    // Override prose styles for better newsletter rendering
                    '--tw-prose-body': 'var(--foreground)',
                    '--tw-prose-headings': 'var(--foreground)',
                    '--tw-prose-links': 'var(--primary)',
                    '--tw-prose-bold': 'var(--foreground)',
                    '--tw-prose-counters': 'var(--muted-foreground)',
                    '--tw-prose-bullets': 'var(--muted-foreground)',
                    '--tw-prose-hr': 'var(--border)',
                    '--tw-prose-quotes': 'var(--muted-foreground)',
                    '--tw-prose-quote-borders': 'var(--border)',
                    '--tw-prose-captions': 'var(--muted-foreground)',
                    '--tw-prose-code': 'var(--foreground)',
                    '--tw-prose-pre-code': 'var(--muted-foreground)',
                    '--tw-prose-pre-bg': 'var(--muted)',
                    '--tw-prose-th-borders': 'var(--border)',
                    '--tw-prose-td-borders': 'var(--border)',
                  } as React.CSSProperties}
                />
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    Inhalt wird geladen...
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
