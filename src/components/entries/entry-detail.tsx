'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ChevronLeft, ChevronRight, Heart, Inbox, ListFilter, X } from 'lucide-react'
import DOMPurify from 'dompurify'
import { getRelativeTime } from '@/lib/utils/content-utils'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useAuth } from '@/lib/hooks'
import { NewsletterViewer } from '@/components/newsletter/newsletter-viewer'
import { useNavigationGestures } from '@/lib/hooks/use-navigation-gestures'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'

interface EntryDetailProps {
  entryId: string
}

/**
 * Detailed view of a newsletter entry with full HTML content rendering
 * Includes read status management and safe HTML sanitization
 */
export function EntryDetail({ entryId }: EntryDetailProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuth()
  const [sanitizedContent, setSanitizedContent] = useState<string>('')
  const [entry, setEntry] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [adjacentEntries, setAdjacentEntries] = useState<{
    previous: string | null;
    next: string | null;
    source: 'issues' | 'archive';
  }>({ previous: null, next: null, source: 'issues' })
  const [navigationVisible, setNavigationVisible] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Einfache Scroll-Position-Wiederherstellung mit sessionStorage
  const scrollPositionKey = `scroll-position-${entryId}`
  
  // Determine source (issues or archive) from pathname and extract search params
  const determineSource = (): 'issues' | 'archive' => {
    // Verbesserte Pfaderkennung für Archive
    if (pathname?.includes('/archive/') || pathname?.includes('/archive?')) {
      return 'archive'
    }
    return 'issues'
  }
  
  // Extract search and filter parameters from URL
  const extractSearchParams = (): { searchQuery: string; statusFilter: string } => {
    // Default values
    const defaults = { searchQuery: '', statusFilter: 'all' }
    
    // If we're not in a browser environment, return defaults
    if (typeof window === 'undefined') return defaults
    
    try {
      // Get current URL search params
      const url = new URL(window.location.href)
      const searchQuery = url.searchParams.get('q') || ''
      const statusFilter = url.searchParams.get('filter') || 'all'
      
      return { searchQuery, statusFilter }
    } catch (err) {
      console.error('Error extracting search params:', err)
      return defaults
    }
  }

  // Fetch adjacent entries (previous and next) with filtering
  const fetchAdjacentEntries = async (currentEntryId: string) => {
    if (!user) return
    
    try {
      // Hole zuerst den aktuellen Eintrag, um seinen Archivstatus zu prüfen
      const { data: currentEntry } = await supabase
        .from('entries')
        .select('archived')
        .eq('id', currentEntryId)
        .single()
      
      // Bestimme die Quelle basierend auf dem Archivstatus des aktuellen Eintrags
      const isArchived = currentEntry?.archived || false
      const source = isArchived ? 'archive' : 'issues'
      const filter = { archived: isArchived }
      const { searchQuery, statusFilter } = extractSearchParams()
      
      console.log('Debug navigation:', { 
        source, 
        filter, 
        pathname, 
        currentEntryId,
        isArchived,
        searchQuery, 
        statusFilter 
      })
      
      // Verbesserte Abfrage mit korrektem Join für subscriptions
      // Wir holen mehr Daten für die Client-seitige Filterung
      const { data: allEntries, error } = await supabase
        .from('entries')
        .select(`
          id, 
          title, 
          published_at, 
          created_at,
          status,
          starred,
          subscription:subscriptions!inner(user_id, title)
        `)
        .eq('subscription.user_id', user.id)
        .eq('archived', filter.archived)
        .order('published_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching adjacent entries:', error)
        return
      }
      
      if (!allEntries || allEntries.length === 0) {
        return
      }
      
      // Wende die gleichen Filter an wie auf der Issues/Archive-Seite
      const filteredEntries = allEntries.filter(entry => {
        // Status filter
        if (statusFilter === 'favorites') {
          if (!entry.starred) return false
        } else if (statusFilter !== 'all' && entry.status !== statusFilter) {
          return false
        }
        
        // Search filter - nur nach Titel und Quelle filtern
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase()
          const titleMatch = entry.title?.toLowerCase().includes(query)
          const sourceMatch = entry.subscription?.title?.toLowerCase().includes(query)
          
          return titleMatch || sourceMatch
        }
        
        return true
      })
      
      console.log('Debug filtered entries:', { 
        filteredEntriesCount: filteredEntries.length,
        currentEntryId
      })
      
      // Find the index of the current entry in the filtered list
      const currentIndex = filteredEntries.findIndex(e => e.id === currentEntryId)
      
      console.log('Debug current index:', { currentIndex, currentEntryId })
      
      if (currentIndex === -1) {
        console.log('Current entry not found in filtered entries')
        return
      }
      
      // Get previous and next entry IDs from the filtered list
      const previousEntry = currentIndex < filteredEntries.length - 1 ? filteredEntries[currentIndex + 1].id : null
      const nextEntry = currentIndex > 0 ? filteredEntries[currentIndex - 1].id : null
      
      console.log('Debug adjacent entries:', { previousEntry, nextEntry, source })
      
      setAdjacentEntries({
        previous: previousEntry,
        next: nextEntry,
        source
      })
      
      // Show navigation indicators briefly
      setNavigationVisible(true)
      setTimeout(() => setNavigationVisible(false), 2000)
    } catch (err) {
      console.error('Error fetching adjacent entries:', err)
    }
  }
  
  // Navigate to previous or next entry while preserving search params
  const navigateToEntry = (entryId: string | null) => {
    if (!entryId) return
    
    const source = determineSource()
    const { searchQuery, statusFilter } = extractSearchParams()
    
    // Baue die URL mit den aktuellen Suchparametern
    let url = `/${source}/${entryId}`
    
    // Füge Suchparameter hinzu, wenn vorhanden
    const params = new URLSearchParams()
    if (searchQuery) params.set('q', searchQuery)
    if (statusFilter !== 'all') params.set('filter', statusFilter)
    
    // Füge Parameter zur URL hinzu, wenn vorhanden
    const queryString = params.toString()
    if (queryString) url += `?${queryString}`
    
    router.push(url)
  }
  
  // Navigate to previous entry
  const navigateToPrevious = () => {
    if (adjacentEntries.previous) {
      navigateToEntry(adjacentEntries.previous)
    }
  }
  
  // Navigate to next entry
  const navigateToNext = () => {
    if (adjacentEntries.next) {
      navigateToEntry(adjacentEntries.next)
    }
  }
  
  // Navigate back to list view while preserving search params
  const navigateBack = () => {
    const source = adjacentEntries.source
    const { searchQuery, statusFilter } = extractSearchParams()
    
    // Baue die URL mit den aktuellen Suchparametern
    let url = `/${source}`
    
    // Füge Suchparameter hinzu, wenn vorhanden
    const params = new URLSearchParams()
    if (searchQuery) params.set('q', searchQuery)
    if (statusFilter !== 'all') params.set('filter', statusFilter)
    
    // Füge Parameter zur URL hinzu, wenn vorhanden
    const queryString = params.toString()
    if (queryString) url += `?${queryString}`
    
    router.push(url)
  }
  
  // Debug-Ausgabe für die Navigation
  useEffect(() => {
    if (adjacentEntries.next || adjacentEntries.previous) {
      console.log('Navigation verfügbar:', {
        next: adjacentEntries.next,
        previous: adjacentEntries.previous,
        source: adjacentEntries.source
      })
    }
  }, [adjacentEntries])
  
  // Setup swipe and keyboard navigation
  useNavigationGestures({
    onNext: navigateToNext,
    onPrevious: navigateToPrevious,
    onBack: navigateBack,
    containerRef,
    enabled: !isLoading && !!entry
  })
  
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
      
      // Fetch adjacent entries for navigation
      await fetchAdjacentEntries(data.id)
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
    
    // Reset navigation visibility when entry changes
    setNavigationVisible(false)
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
  
  // Scroll-Position speichern
  useEffect(() => {
    if (!isLoading && entry) {
      const handleScroll = () => {
        try {
          // Aktuelle Scroll-Position speichern
          const currentScrollY = window.scrollY;
          sessionStorage.setItem(scrollPositionKey, currentScrollY.toString());
          
          // Scroll-Position für Animation der Navigationsleiste aktualisieren
          setLastScrollY(currentScrollY);
        } catch (err) {
          console.error('Error in scroll handler:', err)
        }
      }
      
      // Event-Listener mit Passive-Option für bessere Performance
      window.addEventListener('scroll', handleScroll, { passive: true })
      
      // Initial check
      handleScroll();
      
      return () => {
        window.removeEventListener('scroll', handleScroll)
      }
    }
  }, [isLoading, entry, scrollPositionKey])

  if (isLoading) {
    return (
      <div className="container mx-auto px-0 sm:px-4 md:px-6 py-4 sm:max-w-4xl">
        <Card className="shadow-sm rounded-none sm:rounded-lg">
          <CardContent className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !entry) {
    return (
      <div className="container mx-auto px-0 sm:px-4 md:px-6 py-4 sm:max-w-4xl">
        <Card className="shadow-sm rounded-none sm:rounded-lg">
          <CardHeader>
            <Button variant="ghost" size="sm" onClick={() => router.back()} className="-ml-2 mb-2">
              Back
            </Button>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <h2 className="text-xl font-semibold mb-2">Entry not found</h2>
              <p className="text-muted-foreground mb-4">
                The requested newsletter entry could not be loaded.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Dieser useEffect wurde entfernt, da er doppelt war

  return (
    <div className="min-h-screen pb-16" ref={containerRef}>
      {/* Navigation indicators */}
      {/* Navigation indicators - mit Klick-Funktionalität */}
      <div className={`fixed inset-y-0 left-0 z-40 flex items-center transition-opacity duration-300 ${navigationVisible ? 'opacity-50' : 'opacity-0'}`}>
        {adjacentEntries.previous && (
          <button 
            onClick={navigateToPrevious}
            className="bg-background/80 p-2 rounded-r-full ml-1 hover:bg-background/90 focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Older entry"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
        )}
      </div>
      
      <div className={`fixed inset-y-0 right-0 z-40 flex items-center transition-opacity duration-300 ${navigationVisible ? 'opacity-50' : 'opacity-0'}`}>
        {adjacentEntries.next && (
          <button 
            onClick={navigateToNext}
            className="bg-background/80 p-2 rounded-l-full mr-1 hover:bg-background/90 focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Newer entry"
          >
            <ChevronRight className="h-8 w-8" />
          </button>
        )}
      </div>
      
      {/* Sticky header/footer */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-background">
        <div className="container max-w-4xl mx-auto px-4 py-2 flex items-center justify-between">
          {/* Previous Button */}
          <div>
            {adjacentEntries.previous ? (
              <Button variant="ghost" size="sm" onClick={navigateToPrevious} title="Older entry">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Older
              </Button>
            ) : (
              <div className="w-[90px]"></div>
            )}
          </div>

          {/* Centered Buttons */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={navigateBack}>
              Back
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleArchivedStatus}
              aria-pressed={entry?.archived}
              title={entry?.archived ? 'Remove from archive' : 'Archive'}
              className={entry?.archived ? 'text-primary' : ''}
            >
              <Inbox className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleStarredStatus}
              aria-pressed={entry?.starred}
              title={entry?.starred ? 'Remove from likes' : 'Add to likes'}
              className={entry?.starred ? 'text-rose-500' : ''}
            >
              <Heart className={`h-4 w-4 ${entry?.starred ? 'fill-current' : ''}`} />
            </Button>
          </div>
          
          {/* Next Button */}
          <div>
            {adjacentEntries.next ? (
              <Button variant="ghost" size="sm" onClick={navigateToNext} title="Newer entry">
                Newer
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <div className="w-[90px]"></div>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container mx-auto px-0 sm:px-4 md:px-6 py-4 sm:max-w-4xl">
        <Card className="shadow-sm rounded-none sm:rounded-lg">
          <CardHeader className="space-y-2 px-4 sm:px-6">
            <CardTitle className="text-xl sm:text-2xl">
              {entry.title}
            </CardTitle>
            <CardDescription className="flex items-center gap-2 text-base">
              <span className="font-medium text-foreground">
                {entry.subscription.title}
              </span>
              <span>•</span>
              <span>{getRelativeTime(entry.published_at || entry.created_at)}</span>
            </CardDescription>
          </CardHeader>
          
          <CardContent className="px-4 sm:px-6">
            {sanitizedContent ? (
              <NewsletterViewer
                htmlContent={sanitizedContent}
                maxWidth="100%"
                preserveOriginalStyles
                removeTrackingPixels
                makeImagesResponsive
                fixTableLayouts
                enableDarkMode
                wrapInContainer
                className="newsletter-view-mode"
              />
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Inhalt wird geladen...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>

  )
}
