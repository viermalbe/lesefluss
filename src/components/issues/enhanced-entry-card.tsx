'use client'

import { useRouter } from 'next/navigation'
import { Clock, Calendar, Heart, Archive } from 'lucide-react'
import { getRelativeTime, getEstimatedReadingTime } from '@/lib/utils/content-utils'
import { NewsletterPreview } from './newsletter-preview'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'

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
    router.push(`/issues/${entry.id}`)
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
    <div 
      className={`bg-card rounded-lg transition-all duration-200 border hover:shadow-md cursor-pointer group ${
        entry.status === 'read' ? 'border-gray-300' : ''
      }`}
      onClick={handleCardClick}
    >
      <div className="p-4 relative">
        {/* Action Icons - Top right corner */}
        <div className="absolute top-3 right-3 flex gap-1 z-10">
          {/* Archive Icon */}
          <button
            onClick={handleToggleArchived}
            className={`p-1 hover:opacity-80 transition-opacity ${
              entry.archived ? 'text-gray-900' : 'text-slate-400'
            }`}
            title={entry.archived ? 'Unarchive' : 'Archive'}
          >
            <Archive className={`w-4 h-4 ${
              entry.archived ? 'fill-slate-400' : ''
            }`} />
          </button>
          
          {/* Heart Icon for Favorites */}
          <button
            onClick={handleToggleStarred}
            className={`p-1 hover:opacity-80 transition-opacity ${
              entry.starred ? 'text-pink-500' : 'text-gray-400'
            }`}
            title={entry.starred ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart className={`w-4 h-4 ${
              entry.starred ? 'fill-pink-600' : ''
            }`} />
          </button>
        </div>

        {/* Main Content Layout */}
        <div className="flex gap-3 mb-0">
          {/* Preview Image - 64x64 */}
          <div className="w-16 h-16 overflow-hidden flex-shrink-0">
            <NewsletterPreview 
              htmlContent={entry.content_html}
              sourceImageUrl={entry.subscription.image_url}
              className="w-full h-full"
            />
          </div>
          
          {/* Content - Source and Title */}
          <div className="flex-1 min-w-0">
            
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              {entry.subscription.title}
            </div>
            
            <h3 className={`text-base line-clamp-2 leading-tight ${
              entry.status === 'read' ? 'text-gray-600' : 'text-gray-900 font-medium'
            }`}>
              {entry.title}
            </h3>
          </div>
        </div>

        {/* Meta Information Row */}
        <div className="space-y-3">
          
          {/* Meta Information with Status Badge */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-3 text-sm text-gray-500">
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
                  ? 'bg-black text-white hover:bg-gray-800' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {isUnread ? 'NEW' : 'OPENED'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
