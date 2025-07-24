'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Calendar, Heart, Archive } from 'lucide-react'
import DOMPurify from 'dompurify'
import { getRelativeTime } from '@/lib/utils/content-utils'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useAuth } from '@/lib/hooks'
import { NewsletterViewer } from '@/components/newsletter/newsletter-viewer'

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
  
  // Einfache Scroll-Position-Wiederherstellung mit sessionStorage
  const scrollPositionKey = `scroll-position-${entryId}`

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
      
      // Direkt das Original-HTML anzeigen (nur grundlegende Sicherheitsbereinigung)
      if (data.content_html) {
        // Einfache DOMPurify-Bereinigung ohne Transformationen
        const basicSanitized = DOMPurify.sanitize(data.content_html, {
          ADD_ATTR: ['target'],
          FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'button'],
          FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
        })
        setSanitizedContent(basicSanitized)
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
      // Einfache DOMPurify-Bereinigung ohne Transformationen
      const basicSanitized = DOMPurify.sanitize(entry.content_html, {
        ADD_ATTR: ['target'],
        FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input', 'button'],
        FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
      })
      setSanitizedContent(basicSanitized)
    }
  }, [entry?.content_html])
  
  // Einfache Scroll-Position-Wiederherstellung
  useEffect(() => {
    if (!isLoading && entry) {
      // Verzögerung, um sicherzustellen, dass der Inhalt vollständig geladen ist
      const timer = setTimeout(() => {
        try {
          // Gespeicherte Position abrufen
          const savedPosition = sessionStorage.getItem(scrollPositionKey)
          if (savedPosition) {
            window.scrollTo({
              top: parseInt(savedPosition),
              behavior: 'instant' // Sofortiges Scrollen ohne Animation
            })
          }
        } catch (err) {
          console.error('Error restoring scroll position:', err)
        }
      }, 100) // Kurze Verzögerung
      
      return () => clearTimeout(timer)
    }
  }, [isLoading, entry, scrollPositionKey])
  
  // Scroll-Position speichern beim Scrollen
  useEffect(() => {
    if (!isLoading && entry) {
      const handleScroll = () => {
        try {
          sessionStorage.setItem(scrollPositionKey, window.scrollY.toString())
        } catch (err) {
          console.error('Error saving scroll position:', err)
        }
      }
      
      // Event-Listener mit Passive-Option für bessere Performance
      window.addEventListener('scroll', handleScroll, { passive: true })
      
      return () => {
        window.removeEventListener('scroll', handleScroll)
      }
    }
  }, [isLoading, entry, scrollPositionKey])

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
      {/* Sticky header with navigation and actions */}
      <div className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="bg-transparent hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
          
          <div className="flex items-center gap-4">
            {/* Archive Button */}
            <button
              onClick={toggleArchivedStatus}
              className={`p-2 rounded-full hover:bg-gray-100 transition-colors ${
                entry?.archived ? 'text-gray-900' : 'text-gray-500'
              }`}
              title={entry?.archived ? 'Remove from archive' : 'Archive'}
            >
              <Archive className={`w-5 h-5 ${entry?.archived ? 'fill-gray-400' : ''}`} />
            </button>
            
            {/* Like Button */}
            <button
              onClick={toggleStarredStatus}
              className={`p-2 rounded-full hover:bg-gray-100 transition-colors ${
                entry?.starred ? 'text-rose-500' : 'text-gray-500'
              }`}
              title={entry?.starred ? 'Remove from likes' : 'Add to likes'}
            >
              <Heart className={`w-5 h-5 ${entry?.starred ? 'fill-rose-500' : ''}`} />
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile-optimized container */}
      <div className="max-w-4xl mx-auto">
        {/* Entry content - Mobile: no card, Desktop: with card */}
        <div className="sm:p-6">
          {/* Mobile: Direct content, Desktop: Card wrapper */}
          <div className="sm:bg-card sm:border sm:rounded-lg sm:shadow-sm">
            {/* Integrated Header with Back Button */}
            <div className="p-4 sm:p-6 border-b">
              <div className="space-y-4">

                
                {/* Title and Source */}
                <h1 className="text-xl sm:text-2xl font-bold mb-0 text-foreground leading-tight">
                  {entry.title}
                </h1>
                
                <div className="flex items-center gap-2 text-base text-muted-foreground">
                  <span className="font-medium text-foreground">{entry.subscription.title}</span>
                  <span className="text-gray-500">•</span>
                  <span>{getRelativeTime(entry.published_at || entry.created_at)}</span>
                </div>
                
              </div>
            </div>

            {/* Content section */}
            <div className="p-4 sm:p-6">
              {sanitizedContent ? (
                <NewsletterViewer 
                  htmlContent={sanitizedContent}
                  maxWidth="800px"
                  preserveOriginalStyles={true}
                  removeTrackingPixels={true}
                  makeImagesResponsive={true}
                  fixTableLayouts={true}
                  enableDarkMode={true}
                  wrapInContainer={true}
                  className="newsletter-view-mode"
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
