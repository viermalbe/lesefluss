'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/hooks'
import { useSmartSync } from '@/lib/hooks/useSmartSync'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EnhancedEntryCard } from '@/components/issues/enhanced-entry-card'
import { BookOpen, Search, Filter, RefreshCw, Inbox, MailWarning, MailOpen, Heart, Archive } from 'lucide-react'
import { useScrollPosition } from '@/lib/utils/scroll-position'
import { InfiniteScroll } from '@/components/ui/infinite-scroll'
import Link from 'next/link'

// Verhindert das automatische Neuladen beim Fokuswechsel
function disableFocusRefresh() {
  if (typeof window === 'undefined') return

  // Überschreibe die visibilityState-Getter-Methode
  try {
    Object.defineProperty(Document.prototype, 'visibilityState', {
      get: function() {
        // Gib immer "visible" zurück, unabhängig vom tatsächlichen Status
        return 'visible'
      }
    })
    console.log('Focus refresh disabled: visibilityState overridden')
  } catch (e) {
    console.error('Could not override visibilityState:', e)
  }
}

// Konstanten für die Pagination
const ITEMS_PER_PAGE = 15

function IssuesPageContent() {
  const { user, loading } = useAuth()
  const { isLoading: syncLoading, canSync, triggerSync, autoSyncIfNeeded, getTimeUntilNextSync } = useSmartSync()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false)
  const [entries, setEntries] = useState<any[]>([])
  const [entriesLoading, setEntriesLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isStateLoaded, setIsStateLoaded] = useState(false)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMoreEntries, setHasMoreEntries] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  
  // Verhindere automatisches Neuladen beim Fokuswechsel
  useEffect(() => {
    disableFocusRefresh()
  }, [])
  
  // Scroll position management - mit automatischer Wiederherstellung
  const { savePosition, restorePosition, setupAutoSave } = useScrollPosition('issues-page')

  // Load persistent state from localStorage and URL parameters
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSearch = localStorage.getItem('lesefluss-search-query')
      const savedFilter = localStorage.getItem('lesefluss-filter-state')
      
      // Check for URL parameters
      const sourceFromUrl = searchParams.get('source')
      const statusFromUrl = searchParams.get('status')
      
      // Load saved state first
      if (savedSearch) setSearchQuery(savedSearch)
      if (savedFilter) setStatusFilter(savedFilter)
      
      // Override with URL parameters if present
      if (sourceFromUrl) {
        setSearchQuery(sourceFromUrl)
      }
      if (statusFromUrl) {
        setStatusFilter(statusFromUrl)
      }
      
      setIsStateLoaded(true)
    }
  }, [searchParams])

  // Save search query to localStorage (only after initial load)
  useEffect(() => {
    if (typeof window !== 'undefined' && isStateLoaded) {
      localStorage.setItem('lesefluss-search-query', searchQuery)
    }
  }, [searchQuery, isStateLoaded])

  // Save filter state to localStorage (only after initial load)
  useEffect(() => {
    if (typeof window !== 'undefined' && isStateLoaded) {
      localStorage.setItem('lesefluss-filter-state', statusFilter)
    }
  }, [statusFilter, isStateLoaded])
  
  // Verbesserte Scroll-Position-Verwaltung mit automatischer Wiederherstellung
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    // Set up auto-save for scroll position
    const cleanup = setupAutoSave()
    
    return cleanup
  }, [setupAutoSave])
  
  // Restore scroll position only after initial entries are loaded
  useEffect(() => {
    if (!entriesLoading && entries.length > 0 && currentPage === 1 && typeof window !== 'undefined') {
      // Multiple restoration attempts with different delays for reliability
      const scrollAttempts = [100, 300, 600, 1000]
      
      scrollAttempts.forEach((delay) => {
        setTimeout(() => {
          restorePosition()
        }, delay)
      })
    }
  }, [entriesLoading, entries.length, currentPage, restorePosition])

  // Fetch entries function with pagination
  const fetchEntries = async (page = 1, reset = true) => {
    if (!user) return
    
    if (reset) {
      setEntriesLoading(true)
      setCurrentPage(1)
    } else {
      setIsLoadingMore(true)
    }
    
    try {
      // Calculate pagination parameters
      const limit = ITEMS_PER_PAGE
      const from = (page - 1) * limit
      const to = from + limit - 1
      
      console.log(`Fetching entries page ${page}: range ${from}-${to}`)
      
      let query = supabase
        .from('entries')
        .select(`
          *,
          subscription:subscriptions!inner(
            id,
            title,
            user_id,
            status,
            image_url
          )
        `, { count: 'exact' }) // Request exact count for pagination
        .eq('subscription.user_id', user.id)
        
      // WICHTIG: Archiv-Filter korrekt anwenden
      // Wenn wir im Archiv-Filter sind, zeige nur archivierte Einträge
      // Ansonsten zeige nur nicht-archivierte Einträge
      query = query.eq('archived', statusFilter === 'archive')
      
      // Sortiere nach Veröffentlichungsdatum (neueste zuerst)
      query = query.order('published_at', { ascending: false })
      
      // Apply pagination
      query = query.range(from, to)
      
      const { data, error, count } = await query
      
      if (error) {
        console.error('Error fetching entries:', error)
        return
      }
      
      // Update state based on whether this is a reset or load more
      if (reset) {
        setEntries(data || [])
      } else {
        setEntries(prev => [...prev, ...(data || [])])
      }
      
      // Check if there are more entries to load
      const totalFetched = (page * limit)
      const hasMore = count ? totalFetched < count : false
      setHasMoreEntries(hasMore)
      
      // Update current page if this was a successful load more
      if (!reset && data && data.length > 0) {
        setCurrentPage(page)
      }
      
      return hasMore
    } catch (error) {
      console.error('Error fetching entries:', error)
      return false
    } finally {
      if (reset) {
        setEntriesLoading(false)
      } else {
        setIsLoadingMore(false)
      }
    }
  }

  // Mark entry as read/unread
  const toggleReadStatus = async (entryId: string, newStatus: string) => {
    // Finde den Eintrag, um seine aktuellen Werte zu kennen
    const entryToUpdate = entries.find(entry => entry.id === entryId)
    if (!entryToUpdate) return
    
    const currentStatus = entryToUpdate.status
    const isArchived = entryToUpdate.archived
    
    // Prüfe, ob der Archivstatus geändert werden muss
    // Wenn ein Eintrag auf ungelesen gesetzt wird und archiviert ist, entferne den Archiv-Status
    const shouldUpdateArchive = newStatus === 'unread' && isArchived
    
    // Update local state first for immediate UI feedback
    setEntries(prevEntries => prevEntries.map(entry => {
      if (entry.id === entryId) {
        const updatedEntry = { 
          ...entry, 
          status: newStatus as 'read' | 'unread'
        }
        
        // Wenn auf ungelesen gesetzt und archiviert, entferne Archiv-Status
        if (shouldUpdateArchive) {
          updatedEntry.archived = false
        }
        
        return updatedEntry
      }
      return entry
    }))
    
    // Then send the API request
    const updateData: { status: 'read' | 'unread'; archived?: boolean } = { status: newStatus as 'read' | 'unread' }
    if (shouldUpdateArchive) {
      updateData.archived = false
    }
    
    const { error } = await supabase
      .from('entries')
      .update(updateData)
      .eq('id', entryId)
    
    if (error) {
      console.error('Error updating entry status:', error)
      // Revert local state if API call fails
      setEntries(prevEntries => prevEntries.map(entry => {
        if (entry.id === entryId) {
          const revertedEntry = { 
            ...entry, 
            status: currentStatus as 'read' | 'unread'
          }
          
          if (shouldUpdateArchive) {
            revertedEntry.archived = true
          }
          
          return revertedEntry
        }
        return entry
      }))
    }
  }

  // Toggle starred status
  const toggleStarredStatus = (entryId: string, newStarredValue: boolean) => {
    // Finde den Eintrag, um seine aktuellen Werte zu kennen
    const entryToUpdate = entries.find(entry => entry.id === entryId)
    if (!entryToUpdate) return
    
    // WICHTIG: Wenn ein Eintrag geliked wird und wir im Archiv-Filter sind,
    // muss er aus der Ansicht entfernt werden, da er nicht mehr archiviert ist
    if (newStarredValue && statusFilter === 'archive') {
      setEntries(prevEntries => prevEntries.filter(entry => entry.id !== entryId))
      return // Wichtig: Beende die Funktion hier
    }
    
    // WICHTIG: Wenn ein Eintrag nicht mehr geliked wird und wir im Favoriten-Filter sind,
    // muss er aus der Ansicht entfernt werden
    if (!newStarredValue && statusFilter === 'favorites') {
      setEntries(prevEntries => prevEntries.filter(entry => entry.id !== entryId))
      return // Wichtig: Beende die Funktion hier
    }
    
    // In allen anderen Fällen aktualisiere den Eintrag in der Liste
    setEntries(prevEntries => prevEntries.map(entry => {
      if (entry.id === entryId) {
        // Aktualisiere alle relevanten Felder
        const updatedEntry = { ...entry, starred: newStarredValue }
        
        // Wenn ein Eintrag geliked wird und archiviert ist, entferne den Archiv-Status
        if (newStarredValue && entry.archived) {
          updatedEntry.archived = false
        }
        
        return updatedEntry
      }
      return entry
    }))
  }

  // Toggle archived status
  const toggleArchived = (entryId: string, newArchived: boolean) => {
    // Finde den Eintrag, um seine aktuellen Werte zu kennen
    const entryToUpdate = entries.find(entry => entry.id === entryId)
    if (!entryToUpdate) return
    
    // WICHTIG: Wenn ein Eintrag archiviert wird und wir NICHT im Archiv-Filter sind,
    // muss er aus der Ansicht entfernt werden
    if (newArchived && statusFilter !== 'archive') {
      console.log('Removing archived entry from view, current filter:', statusFilter)
      // Entferne den Eintrag aus der Liste
      setEntries(prevEntries => prevEntries.filter(entry => entry.id !== entryId))
      return // Wichtig: Beende die Funktion hier
    }
    
    // Wenn ein Eintrag entarchiviert wird und wir IM Archiv-Filter sind,
    // muss er ebenfalls aus der Ansicht entfernt werden
    if (!newArchived && statusFilter === 'archive') {
      console.log('Removing unarchived entry from archive view')
      // Entferne den Eintrag aus der Liste
      setEntries(prevEntries => prevEntries.filter(entry => entry.id !== entryId))
      return // Wichtig: Beende die Funktion hier
    }
    
    // In allen anderen Fällen aktualisiere den Eintrag in der Liste
    setEntries(prevEntries => prevEntries.map(entry => {
      if (entry.id === entryId) {
        // Aktualisiere alle relevanten Felder
        const updatedEntry = { ...entry, archived: newArchived }
        
        // Wenn archiviert wird, setze auch andere Felder
        if (newArchived) {
          updatedEntry.status = 'read'
          updatedEntry.starred = false
        }
        
        return updatedEntry
      }
      return entry
    }))
  }

  // Auth guard effect
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login')
      } else {
        setHasCheckedAuth(true)
        fetchEntries(1, true)
      }
    }
  }, [user, loading, router])
  
  // Refetch entries when filters change
  useEffect(() => {
    if (user && hasCheckedAuth) {
      fetchEntries(1, true) // Reset and fetch first page
    }
  }, [searchQuery, statusFilter, user, hasCheckedAuth])

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (!user || !hasCheckedAuth) {
    return null
  }

  // Apply client-side filtering for both status and search
  const filteredEntries = entries.filter(entry => {
    // Status filter
    if (statusFilter === 'favorites') {
      if (!entry.starred) return false
    } else if (statusFilter === 'archive') {
      // Archiv-Filter wird bereits serverseitig angewendet
      // Hier könnten weitere Filterregeln für archivierte Einträge hinzugefügt werden
    } else if (statusFilter !== 'all' && entry.status !== statusFilter) {
      return false
    }

    // Search filter (fulltext search across title, content, and source name)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const titleMatch = entry.title?.toLowerCase().includes(query)
      const contentMatch = entry.content_text?.toLowerCase().includes(query)
      const sourceMatch = entry.subscription?.title?.toLowerCase().includes(query)
      
      return titleMatch || contentMatch || sourceMatch
    }
    
    return true
  })
  
  // Handler for loading more entries
  const handleLoadMore = async (): Promise<boolean> => {
    if (isLoadingMore || !hasMoreEntries) return false
    const nextPage = currentPage + 1
    const result = await fetchEntries(nextPage, false)
    // Ensure we always return a boolean value
    return result === true
  }

  // Funktion, die den Seitentitel basierend auf dem Filter zurückgibt
  const getPageTitle = () => {
    switch (statusFilter) {
      case 'all':
        return 'Inbox'
      case 'unread':
        return 'New'
      case 'favorites':
        return 'Liked'
      case 'read':
        return 'Opened'
      case 'archive':
        return 'Archive'
      default:
        return 'Inbox'
    }
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/*<div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">
          {getPageTitle()}
        </h1>
        <p className="text-muted-foreground mt-1">
          {filteredEntries.length > 0 ? (
            searchQuery.trim() || statusFilter !== 'all' 
              ? `${filteredEntries.length} of ${entries.length} articles shown`
              : `${entries.length} article${entries.length === 1 ? '' : 's'} available`
          ) : 'No articles '}
        </p>
      </div>*/}

      {/* Search and Filter Bar */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full border-border focus-visible:ring-ring"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px] border-border">
              <div className="flex items-center">
                {/* Dynamisches Icon basierend auf dem aktuellen Filter */}
                <span className="mr-2 text-muted-foreground">
                  {(() => {
                    switch (statusFilter) {
                      case 'all': return <Inbox className="h-4 w-4" />
                      case 'unread': return <MailWarning className="h-4 w-4" />
                      case 'favorites': return <Heart className="h-4 w-4" />
                      case 'read': return <MailOpen className="h-4 w-4" />
                      case 'archive': return <Archive className="h-4 w-4" />
                      default: return <Inbox className="h-4 w-4" />
                    }
                  })()} 
                </span>
                {/* Benutzerdefiniertes Rendering für den ausgewählten Wert */}
                <span>
                  {(() => {
                    switch (statusFilter) {
                      case 'all': return 'Inbox'
                      case 'unread': return 'New'
                      case 'favorites': return 'Liked'
                      case 'read': return 'Opened'
                      case 'archive': return 'Archive'
                      default: return 'Inbox'
                    }
                  })()}
                </span>
              </div>
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="all">
                <div className="flex items-center">
                  <Inbox className="h-4 w-4 mr-2" />
                  <span>Inbox</span>
                </div>
              </SelectItem>
              <SelectItem value="unread">
                <div className="flex items-center">
                  <MailWarning className="h-4 w-4 mr-2" />
                  <span>New</span>
                </div>
              </SelectItem>
              <SelectItem value="favorites">
                <div className="flex items-center">
                  <Heart className="h-4 w-4 mr-2" />
                  <span>Liked</span>
                </div>
              </SelectItem>
              <SelectItem value="read">
                <div className="flex items-center">
                  <MailOpen className="h-4 w-4 mr-2" />
                  <span>Opened</span>
                </div>
              </SelectItem>
              <SelectItem value="archive">
                <div className="flex items-center">
                  <Archive className="h-4 w-4 mr-2" />
                  <span>Archive</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Issues List */}
      {entriesLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin">
              <RefreshCw className="h-8 w-8 text-primary" />
            </div>
            <div className="text-lg">Loading issues...</div>
          </div>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-16">
          <div className="max-w-md mx-auto">
            <BookOpen className="mx-auto h-16 w-16 text-gray-400 mb-6" />
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Nothing to see here!</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Awesome! You are up to date. 
            </p>
            <Link href="/sources">
              <Button size="lg" className="px-6">
                Add Sources
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <InfiniteScroll
          onLoadMore={handleLoadMore}
          isLoading={isLoadingMore}
          hasMore={hasMoreEntries}
          loadingComponent={
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin">
                <RefreshCw className="h-6 w-6 text-primary" />
              </div>
              <span className="ml-2">Loading more...</span>
            </div>
          }
          endComponent={
            <div className="text-center py-4 text-muted-foreground">
              You've reached the end
            </div>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEntries.map((entry) => (
              <EnhancedEntryCard
                key={entry.id}
                entry={entry}
                onToggleReadStatus={toggleReadStatus}
                onToggleStarred={toggleStarredStatus}
                onToggleArchived={toggleArchived}
              />
            ))}
          </div>
        </InfiniteScroll>
      )}
    </div>
  )
}

// Verbesserte Lazy-Loading-Komponente für bessere Performance und Hydration
const LazyIssuesContent = () => {
  // Verwende useEffect, um clientseitige Hydration zu verbessern
  const [isClient, setIsClient] = useState(false)
  
  useEffect(() => {
    // Setze isClient mit einer kurzen Verzögerung, um Hydration-Probleme zu vermeiden
    const timer = setTimeout(() => {
      setIsClient(true)
    }, 10)
    
    return () => clearTimeout(timer)
  }, [])
  
  // Zeige einen Platzhalter während der Hydration, um Layout-Shifts zu vermeiden
  if (!isClient) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="mb-8">
          <div className="h-8 w-32 bg-gray-200 animate-pulse rounded mb-2"></div>
          <div className="h-4 w-48 bg-gray-200 animate-pulse rounded"></div>
        </div>
        <div className="mb-6">
          <div className="h-10 bg-gray-200 animate-pulse rounded mb-4"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-200 animate-pulse rounded"></div>
          ))}
        </div>
      </div>
    )
  }
  
  return <IssuesPageContent />
}

export default function IssuesPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center py-12 flex-col gap-4">
          <div className="animate-spin">
            <RefreshCw className="h-8 w-8 text-primary" />
          </div>
          <div className="text-lg font-medium">Lade Beiträge...</div>
        </div>
      </div>
    }>
      <LazyIssuesContent />
    </Suspense>
  )
}
