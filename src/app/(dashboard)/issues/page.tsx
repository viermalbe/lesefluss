'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/hooks'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EnhancedEntryCard } from '@/components/issues/enhanced-entry-card'
import { BookOpen, Search, Filter } from 'lucide-react'
import Link from 'next/link'

export default function IssuesPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false)
  const [entries, setEntries] = useState<any[]>([])
  const [entriesLoading, setEntriesLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isStateLoaded, setIsStateLoaded] = useState(false)

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

  // Fetch entries function
  const fetchEntries = async () => {
    if (!user) return
    
    setEntriesLoading(true)
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
        .order('published_at', { ascending: false })
      
      // Status filter will be applied client-side for simplicity
      // This ensures we get all entries and can search across all fields
      
      const { data, error } = await query
      
      if (error) {
        console.error('Error fetching entries:', error)
        return
      }
      
      setEntries(data || [])
    } catch (error) {
      console.error('Error fetching entries:', error)
    } finally {
      setEntriesLoading(false)
    }
  }

  // Mark entry as read/unread
  const toggleReadStatus = async (entryId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'read' ? 'unread' : 'read'
    
    const { error } = await supabase
      .from('entries')
      .update({ status: newStatus })
      .eq('id', entryId)
    
    if (error) {
      console.error('Error updating entry status:', error)
      return
    }
    
    // Update local state
    setEntries(entries.map(entry => 
      entry.id === entryId 
        ? { ...entry, status: newStatus as 'read' | 'unread' }
        : entry
    ))
  }

  // Toggle starred status
  const toggleStarredStatus = (entryId: string, currentStarred: boolean) => {
    // Update local state immediately for better UX
    setEntries(entries.map(entry => 
      entry.id === entryId 
        ? { ...entry, starred: !currentStarred }
        : entry
    ))
  }

  // Auth guard effect
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login')
      } else {
        setHasCheckedAuth(true)
        fetchEntries()
      }
    }
  }, [user, loading, router])
  
  // Refetch entries when filters change
  useEffect(() => {
    if (user && hasCheckedAuth) {
      fetchEntries()
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

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Your Issues</h1>
        <p className="text-gray-600 mt-1">
          {filteredEntries.length > 0 ? (
            searchQuery.trim() || statusFilter !== 'all' 
              ? `${filteredEntries.length} of ${entries.length} issues shown`
              : `${entries.length} issue${entries.length === 1 ? '' : 's'} available`
          ) : 'No issues '}
        </p>
      </div>

      {/* Search and Filter Bar */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search issues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 !bg-white border-gray-900"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px] !bg-white border-gray-900">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="All Issues" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Issues</SelectItem>
              <SelectItem value="unread">New</SelectItem>
              <SelectItem value="favorites">Liked</SelectItem>
              <SelectItem value="read">Read</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Issues List */}
      {entriesLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-lg">Loading issues...</div>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-16">
          <div className="max-w-md mx-auto">
            <BookOpen className="mx-auto h-16 w-16 text-gray-400 mb-6" />
            <h3 className="text-xl font-semibold text-gray-900 mb-3">No issues found</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Add some newsletter sources to see your issues here! Once you subscribe to newsletters, 
              they'll appear as beautiful cards with previews.
            </p>
            <Link href="/sources">
              <Button size="lg" className="px-6">
                Add Sources
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEntries.map((entry) => (
            <EnhancedEntryCard
              key={entry.id}
              entry={entry}
              onToggleReadStatus={toggleReadStatus}
              onToggleStarred={toggleStarredStatus}
            />
          ))}
        </div>
      )}
    </div>
  )
}
