'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, ChevronUp, Heart, Archive, ListFilter, X } from 'lucide-react'
import DOMPurify from 'dompurify'
import { getRelativeTime } from '@/lib/utils/content-utils'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useAuth } from '@/lib/hooks'
import { NewsletterViewer } from '@/components/newsletter/newsletter-viewer'

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
  const [adjacentEntries, setAdjacentEntries] = useState<{
    previous: string | null;
    next: string | null;
    source: 'issues' | 'archive';
  }>({ previous: null, next: null, source: 'issues' })
  // Keine showBackToTop-Variable mehr benötigt

  
  // Einfache Scroll-Position-Wiederherstellung mit sessionStorage
  const scrollPositionKey = `scroll-position-${entryId}`
  
  // Determine source (issues or archive) from pathname and extract search params
  const determineSource = (): string => {
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
      
      // Bestimme die Quelle und Filter basierend auf den URL-Parametern
      const source = 'issues' // Immer issues, da Archive jetzt ein Filter ist
      const { searchQuery, statusFilter } = extractSearchParams()
      
      // Wenn der aktuelle Eintrag archiviert ist, aber der Filter nicht auf "archive" steht,
      // verwenden wir trotzdem den Archiv-Filter, um korrekte Navigation zu ermöglichen
      const isArchived = currentEntry?.archived || false
      const useArchiveFilter = isArchived || statusFilter === 'archive'
      
      console.log('Debug navigation:', { 
        source, 
        useArchiveFilter, 
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
          archived,
          subscription:subscriptions!inner(user_id, title)
        `)
        .eq('subscription.user_id', user.id)
        .eq('archived', useArchiveFilter)
        .order('published_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching adjacent entries:', error)
        return
      }
      
      if (!allEntries || allEntries.length === 0) {
        return
      }
      
      // Wende die gleichen Filter an wie auf der Issues-Seite
      const filteredEntries = allEntries.filter(entry => {
        // Status filter
        if (statusFilter === 'favorites') {
          if (!entry.starred) return false
        } else if (statusFilter === 'archive') {
          // Archiv-Filter wird bereits serverseitig angewendet
          // Hier könnten weitere Filterregeln für archivierte Einträge hinzugefügt werden
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
      
      // Adjacente Einträge wurden geladen
    } catch (err) {
      console.error('Error fetching adjacent entries:', err)
    }
  }
  
  // Navigate to previous or next entry while preserving search params
  const navigateToEntry = (entryId: string | null) => {
    if (!entryId) return
    
    // Immer zu /issues navigieren, da Archive jetzt ein Filter ist
    const source = 'issues'
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
    
    // Wenn ein archivierter Eintrag auf "unread" gesetzt wird, Archiv-Status entfernen
    const updateData: { status: 'read' | 'unread'; archived?: boolean } = { status: newStatus }
    
    // Wenn wir einen Eintrag auf "unread" setzen und er ist archiviert, entferne den Archiv-Status
    if (newStatus === 'unread' && entry.archived) {
      updateData.archived = false
    }
    
    const { error } = await supabase
      .from('entries')
      .update(updateData)
      .eq('id', entryId)
    
    if (error) {
      console.error('Error updating entry status:', error)
      toast.error('Fehler beim Aktualisieren des Status')
      return
    }
    
    // Update local state
    setEntry((prev: any) => ({
      ...prev,
      status: newStatus,
      ...(newStatus === 'unread' && prev.archived ? { archived: false } : {})
    }))
    
    toast.success(newStatus === 'read' ? 'Als geöffnet markiert' : 'Als neu markiert')
  }

  // Toggle starred status
  const toggleStarredStatus = async () => {
    if (!entry) return
    
    const newStarred = !entry.starred
    
    // Wenn ein archivierter Eintrag favorisiert wird, Archiv-Status entfernen
    const updateData: { starred: boolean; archived?: boolean } = { starred: newStarred }
    
    // Wenn wir einen Eintrag favorisieren und er ist archiviert, entferne den Archiv-Status
    if (newStarred && entry.archived) {
      updateData.archived = false
    }
    
    const { error } = await supabase
      .from('entries')
      .update(updateData)
      .eq('id', entryId)
    
    if (error) {
      console.error('Error updating starred status:', error)
      toast.error('Fehler beim Aktualisieren der Favoriten')
      return
    }
    
    // Update local state
    setEntry((prev: any) => ({
      ...prev,
      starred: newStarred,
      ...(newStarred && prev.archived ? { archived: false } : {})
    }))
  }

  // Keine scrollToTop-Funktion mehr benötigt

  // Toggle archived status
  const toggleArchivedStatus = async () => {
    if (!entry) return
    
    const newArchived = !entry.archived
    
    // Beim Archivieren: Status auf "read" setzen und Like entfernen
    const updateData: { archived: boolean; status?: 'read' | 'unread'; starred?: boolean } = { archived: newArchived }
    
    if (newArchived) {
      updateData.status = 'read'
      updateData.starred = false
    }
    
    const { error } = await supabase
      .from('entries')
      .update(updateData)
      .eq('id', entryId)
    
    if (error) {
      console.error('Error updating archived status:', error)
      toast.error('Fehler beim Archivieren')
      return
    }
    
    // Update local state with all changed fields
    setEntry((prev: any) => ({
      ...prev,
      archived: newArchived,
      ...(newArchived ? { status: 'read', starred: false } : {})
    }))
    
    toast.success(newArchived ? 'Archiviert' : 'Aus Archiv entfernt')
    
    // Nach dem Archivieren zum nächsten (älteren) Eintrag navigieren
    // Falls kein älterer Eintrag existiert, zur Übersicht zurückkehren
    if (newArchived) {
      setTimeout(() => {
        if (adjacentEntries.previous) {
          // Zum nächsten (älteren) Eintrag navigieren
          navigateToEntry(adjacentEntries.previous)
        } else {
          // Zur Übersicht zurückkehren, wenn kein älterer Eintrag existiert
          router.back()
        }
      }, 500) // Small delay to show the success toast
    }
  }

  // Fetch entry on mount
  useEffect(() => {
    if (user) {
      fetchEntry()
    }
    
    // Fetch entry when it changes
  }, [user, entryId])
  
  // Kein Scroll-Handler mehr benötigt für Back-to-Top Button

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
          
          // Scroll-Position aktualisiert
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
    <div className="min-h-screen pb-16">
      {/* Floating Action Buttons (Archive & Like) */}
      <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-2">
      <Button 
          onClick={toggleStarredStatus}
          size="icon"
          variant="secondary"
          className={`h-10 w-10 rounded-full shadow-md transition-all duration-200 ${entry?.starred ? 'text-primary' : 'bg-background/80 hover:bg-background'}`}
          aria-label={entry?.starred ? 'Remove from likes' : 'Add to likes'}
          title={entry?.starred ? 'Remove from likes' : 'Add to likes'}
        >
          <Heart className={`h-5 w-5 ${entry?.starred ? 'fill-current' : ''}`} />
        </Button>
        <Button 
          onClick={toggleArchivedStatus}
          size="icon"
          variant="secondary"
          className={`h-10 w-10 rounded-full shadow-md transition-all duration-200 ${entry?.archived ? 'text-primary' : 'bg-background/80 hover:bg-background'}`}
          aria-label={entry?.archived ? 'Remove from archive' : 'Archive'}
          title={entry?.archived ? 'Remove from archive' : 'Archive'}
        >
          <Archive className="h-5 w-5" />
        </Button>
        

      </div>

      
      {/* Sticky header/footer */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-background">
        <div className="container max-w-4xl mx-auto px-4 py-2 flex items-center justify-between">
          {/* Next Button (now on the left) */}
          <div>
            {adjacentEntries.next ? (
              <Button variant="ghost" size="sm" onClick={navigateToNext} title="Newer entry">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Newer
              </Button>
            ) : (
              <div className="w-[90px]"></div>
            )}
          </div>

          {/* Centered Close Button */}
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={navigateBack}
              className="px-4"
            >
              Close
            </Button>
          </div>
          
          {/* Previous Button (now on the right) */}
          <div>
            {adjacentEntries.previous ? (
              <Button variant="ghost" size="sm" onClick={navigateToPrevious} title="Older entry">
                Older
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
