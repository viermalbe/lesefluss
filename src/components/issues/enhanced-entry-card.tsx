'use client'

import { useRouter } from 'next/navigation'
import { Clock, Calendar, Heart, Inbox } from 'lucide-react'
import { getRelativeTime, getEstimatedReadingTime } from '@/lib/utils/content-utils'
import { OptimizedImage } from '@/components/ui/optimized-image'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface EnhancedEntryCardProps {
  entry: {
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
  onToggleReadStatus: (entryId: string, currentStatus: string) => void
  onToggleStarred?: (entryId: string, currentStarred: boolean) => void
  onToggleArchived?: (entryId: string, currentArchived: boolean) => void
}

// Hilfsfunktion zum Extrahieren des ersten Bildes aus HTML-Inhalt
const getFirstImageFromHtml = (html: string): string | null => {
  const imgMatches = html.match(/<img[^>]+src="([^"]+)"[^>]*>/gi)
  if (!imgMatches) return null
  
  for (const imgTag of imgMatches) {
    const srcMatch = imgTag.match(/src="([^"]+)"/i)
    if (!srcMatch) continue
    
    const src = srcMatch[1]
    
    // Skip common tracking pixel patterns
    if (
      src.includes('track') ||
      src.includes('pixel') ||
      src.includes('beacon') ||
      src.includes('analytics') ||
      src.includes('1x1') ||
      src.includes('transparent') ||
      src.endsWith('.gif') && src.includes('1bwq5') // WIRED tracking pattern
    ) {
      continue
    }
    
    // Skip very small images (likely tracking)
    const widthMatch = imgTag.match(/width=["']?(\d+)/i)
    const heightMatch = imgTag.match(/height=["']?(\d+)/i)
    if (widthMatch && heightMatch) {
      const width = parseInt(widthMatch[1])
      const height = parseInt(heightMatch[1])
      if (width < 50 || height < 50) continue
    }
    
    return src
  }
  
  return null
}

export function EnhancedEntryCard({ entry, onToggleReadStatus, onToggleStarred, onToggleArchived }: EnhancedEntryCardProps) {
  const router = useRouter()

  const relativeTime = getRelativeTime(entry.published_at)
  const readingTime = getEstimatedReadingTime(entry.content_html)
  const isUnread = entry.status === 'unread'

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on action buttons
    if ((e.target as HTMLElement).closest('button')) {
      return
    }
    // Wähle den richtigen Pfad basierend auf dem Archivstatus
    const basePath = entry.archived ? '/archive/' : '/issues/'
    router.push(`${basePath}${entry.id}`)
  }

  const handleToggleRead = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleReadStatus(entry.id, entry.status)
  }

  const handleToggleStarred = async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    try {
      const { error } = await supabase
        .from('entries')
        .update({ starred: !entry.starred })
        .eq('id', entry.id)

      if (error) {
        toast.error(`Failed to ${entry.starred ? 'unstar' : 'star'} issue: ${error.message}`)
        return
      }

      toast.success(`Issue ${entry.starred ? 'unstarred' : 'starred'} successfully`)
      
      // Call parent callback if provided
      if (onToggleStarred) {
        onToggleStarred(entry.id, entry.starred)
      }
    } catch (error: any) {
      toast.error(`Failed to update starred status: ${error.message}`)
    }
  }

  const handleToggleArchived = async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    try {
      const { error } = await supabase
        .from('entries')
        .update({ archived: !entry.archived })
        .eq('id', entry.id)

      if (error) {
        toast.error(`Failed to ${entry.archived ? 'unarchive' : 'archive'} issue: ${error.message}`)
        return
      }

      toast.success(`Issue ${entry.archived ? 'unarchived' : 'archived'} successfully`)
      
      // Call parent callback if provided
      if (onToggleArchived) {
        onToggleArchived(entry.id, entry.archived)
      }
    } catch (error: any) {
      toast.error(`Failed to update archived status: ${error.message}`)
    }
  }

  return (
    <Card
      className={cn(
        entry.status === 'unread' ? 'border-primary' : 'border-border'
      )}
      onClick={handleCardClick}
    >
      <CardContent className="relative">
        {/* Action Icons - Top right corner */}
        <div className="absolute -top-2 right-4 flex gap-1 z-10">
          {/* Archive Icon */}
          <button
            onClick={handleToggleArchived}
            className={`rounded-md p-1 hover:bg-muted/50 dark:hover:bg-muted/30 transition-colors ${
              entry.archived ? 'text-primary' : 'text-muted-foreground'
            }`}
            title={entry.archived ? 'Unarchive' : 'Archive'}
          >
            <Inbox className="w-4 h-4" />
          </button>
          
          {/* Heart Icon for Favorites */}
          <button
            onClick={handleToggleStarred}
            className={`rounded-md p-1 hover:bg-muted/50 dark:hover:bg-muted/30 transition-colors ${
              entry.starred ? 'text-primary' : 'text-muted-foreground'
            }`}
            title={entry.starred ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart className={`w-4 h-4 ${
              entry.starred ? 'fill-primary dark:fill-primary' : ''
            }`} />
          </button>
        </div>

        {/* Main Content Layout */}
        <div className="flex gap-3 mb-0">
          {/* Preview Image - 64x64 */}
          <div className="w-12 h-12 overflow-hidden flex-shrink-0 rounded-md">
            <OptimizedImage 
              src={entry.subscription.image_url || getFirstImageFromHtml(entry.content_html)}
              alt={entry.title}
              className="w-full h-full object-contain"
              sourceId={entry.subscription.id}
            />
          </div>
          
          {/* Content - Source and Title */}
          <div className="flex-1 min-w-0" data-component-name="EnhancedEntryCard">
            
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1" data-component-name="EnhancedEntryCard">
              {entry.subscription.title}
            </div>
            
            <h3 className={`text-base line-clamp-2 leading-tight ${
              entry.status === 'read' ? 'text-muted-foreground' : 'text-foreground font-medium'
            }`} data-component-name="EnhancedEntryCard">
              {entry.title}
            </h3>
          </div>
        </div>

        {/* Meta Information Row */}
        <div className="space-y-3">
          
          {/* Meta Information with Status Badge */}
          <div className="flex items-center justify-between pt-4" data-component-name="EnhancedEntryCard">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{relativeTime}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{readingTime}</span>
              </div>
            </div>
            
            {/* Status Badge */}
            <button
              onClick={handleToggleRead}
              className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                isUnread 
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 dark:hover:bg-primary/80' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/70 dark:hover:bg-muted/50'
              }`}
            >
              {isUnread ? 'NEW' : 'OPENED'}
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
