'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks'
import { supabase } from '@/lib/supabase/client'
import { EnhancedEntryCard } from '@/components/issues/enhanced-entry-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Archive, Loader2, Search, Filter } from 'lucide-react'
import { useScrollPosition } from '@/lib/utils/scroll-position'
import { toast } from 'sonner'

interface Entry {
  id: string
  title: string
  content_html: string
  published_at: string
  status: 'read' | 'unread'
  starred: boolean
  archived: boolean
  subscription: {
    id: string
    title: string
    status: string
    image_url?: string | null
  }
}

import { Suspense } from 'react'

function ArchivePageContent() {
  const { user, loading: userLoading } = useAuth()
  
  // Scroll position management
  const { restorePosition, setupAutoSave } = useScrollPosition('archive-page')
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'read' | 'favorites'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch archived entries
  const fetchArchivedEntries = async () => {
    if (!user) return

    setLoading(true)
    try {
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
        `)
        .eq('subscription.user_id', user.id)
        .eq('archived', true)
        .order('published_at', { ascending: false })

      // Apply status filter (except favorites, which is handled client-side)
      if (statusFilter !== 'all' && statusFilter !== 'favorites') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching archived entries:', error)
        toast.error('Fehler beim Laden der archivierten Artikel')
        return
      }

      setEntries(data || [])
    } catch (error) {
      console.error('Error fetching archived entries:', error)
      toast.error('Fehler beim Laden der archivierten Artikel')
    } finally {
      setLoading(false)
    }
  }

  // Toggle read status
  const toggleReadStatus = async (entryId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'read' ? 'unread' : 'read'
    
    const { error } = await supabase
      .from('entries')
      .update({ status: newStatus })
      .eq('id', entryId)

    if (error) {
      console.error('Error updating status:', error)
      toast.error('Fehler beim Aktualisieren des Status')
      return
    }

    // Update local state
    setEntries(prevEntries =>
      prevEntries.map(entry =>
        entry.id === entryId
          ? { ...entry, status: newStatus as 'read' | 'unread' }
          : entry
      )
    )

    toast.success(newStatus === 'read' ? 'Als geöffnet markiert' : 'Als neu markiert')
  }

  // Toggle starred status
  const toggleStarred = async (entryId: string, currentStarred: boolean) => {
    const newStarred = !currentStarred
    
    const { error } = await supabase
      .from('entries')
      .update({ starred: newStarred })
      .eq('id', entryId)

    if (error) {
      console.error('Error updating starred status:', error)
      toast.error('Fehler beim Aktualisieren der Favoriten')
      return
    }

    // Update local state
    setEntries(prevEntries =>
      prevEntries.map(entry =>
        entry.id === entryId
          ? { ...entry, starred: newStarred }
          : entry
      )
    )

    toast.success(newStarred ? 'Zu Favoriten hinzugefügt' : 'Aus Favoriten entfernt')
  }

  // Toggle archived status (unarchive)
  const toggleArchived = async (entryId: string, currentArchived: boolean) => {
    const newArchived = !currentArchived
    
    const { error } = await supabase
      .from('entries')
      .update({ archived: newArchived })
      .eq('id', entryId)

    if (error) {
      console.error('Error updating archived status:', error)
      toast.error('Fehler beim Archivieren')
      return
    }

    // Remove from local state if unarchived
    if (!newArchived) {
      setEntries(prevEntries => prevEntries.filter(entry => entry.id !== entryId))
      toast.success('Aus Archiv entfernt')
    }
  }

  // Apply client-side filtering for both status and search
  const filteredEntries = entries.filter(entry => {
    // Status filter
    if (statusFilter === 'favorites') {
      if (!entry.starred) return false
    } else if (statusFilter !== 'all' && entry.status !== statusFilter) {
      return false
    }

    // Search filter (fulltext search across title, content, and source name)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const titleMatch = entry.title?.toLowerCase().includes(query)
      const contentMatch = entry.content_html?.toLowerCase().includes(query)
      const sourceMatch = entry.subscription?.title?.toLowerCase().includes(query)
      
      return titleMatch || contentMatch || sourceMatch
    }
    
    return true
  })

  // Fetch entries when user or filter changes
  useEffect(() => {
    if (user) {
      fetchArchivedEntries()
    }
  }, [user, statusFilter])
  
  // Set up scroll position management
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    // Set up auto-save for scroll position
    const cleanup = setupAutoSave()
    
    return cleanup
  }, [setupAutoSave])
  
  // Restore scroll position after entries are loaded with multiple attempts
  useEffect(() => {
    if (!loading && entries.length > 0 && typeof window !== 'undefined') {
      // Multiple restoration attempts with different delays for reliability
      const scrollAttempts = [100, 300, 600, 1000]
      
      scrollAttempts.forEach((delay) => {
        setTimeout(() => {
          restorePosition()
        }, delay)
      })
    }
  }, [loading, entries.length, restorePosition])

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Please log in to view archived articles.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Archive</h1>
        <p className="text-muted-foreground mt-1">
          {filteredEntries.length > 0 ? (
            searchQuery.trim() || statusFilter !== 'all' 
              ? `${filteredEntries.length} of ${entries.length} archived issues shown`
              : `${entries.length} archived issue${entries.length === 1 ? '' : 's'} available`
          ) : 'No archived issues '}
        </p>
      </div>

      {/* Search and Filter Bar */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search archived issues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={(value: 'all' | 'unread' | 'read' | 'favorites') => setStatusFilter(value)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="All Issues" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Issues</SelectItem>
              <SelectItem value="unread">New</SelectItem>
              <SelectItem value="favorites">Liked</SelectItem>
              <SelectItem value="read">Opened</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Archive List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-lg">Loading archived issues...</div>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-gray-50 rounded-lg p-8">
            <Archive className="mx-auto h-16 w-16 text-gray-400 mb-6" />
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              {entries.length === 0 ? 'No archived issues' : 'No issues found'}
            </h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              {entries.length === 0 
                ? 'Issues you archive will appear here for easy access later.'
                : 'Try adjusting your search or filter criteria.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEntries.map((entry) => (
            <EnhancedEntryCard
              key={entry.id}
              entry={entry}
              onToggleReadStatus={toggleReadStatus}
              onToggleStarred={toggleStarred}
              onToggleArchived={toggleArchived}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Lazy loading Komponente für bessere Performance
function LazyArchiveContent() {
  // Verwende useEffect, um clientseitige Hydration zu verbessern
  const [isClient, setIsClient] = useState(false)
  
  useEffect(() => {
    setIsClient(true)
  }, [])
  
  if (!isClient) {
    return null
  }
  
  return <ArchivePageContent />
}

export default function ArchivePage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center py-12 flex-col gap-4">
          <div className="animate-spin">
            <Loader2 className="h-8 w-8 text-primary" />
          </div>
          <div className="text-lg font-medium">Lade archivierte Beiträge...</div>
        </div>
      </div>
    }>
      <LazyArchiveContent />
    </Suspense>
  )
}
