'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SourceSettingsModal } from './source-settings-modal'
import { 
  Settings,
  ExternalLink,
  Filter,
  BarChart3,
  Calendar,
  Clock,
  Image as ImageIcon
} from 'lucide-react'
import { getRelativeTime } from '@/lib/utils/content-utils'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'

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
      // Get the latest entry for this subscription
      const { data: latestEntry, error } = await supabase
        .from('entries')
        .select('id')
        .eq('subscription_id', subscription.id)
        .order('published_at', { ascending: false })
        .limit(1)
        .single()

      if (error || !latestEntry) {
        toast.error('No issues found for this source')
        return
      }

      // Navigate to the latest entry detail page
      router.push(`/issues/${latestEntry.id}`)
    } catch (error: any) {
      toast.error('Failed to open latest issue')
    }
  }

  const getStatusColor = () => {
    switch (subscription.status) {
      case 'active': return 'bg-green-500'
      case 'paused': return 'bg-yellow-500'
      case 'error': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const isPaused = subscription.status === 'paused'

  return (
    <>
      <Card className={`hover:shadow-lg transition-all duration-200 overflow-hidden ${
        isPaused ? 'border-gray-300' : ''
      }`}>
        <CardContent className="p-6">
          {/* Header with Cover Image and Title */}
          <div className="flex items-start gap-4 mb-4">
            {/* Cover Image - Not clickable anymore */}
            <div className="flex-shrink-0">
              {subscription.image_url ? (
                <div className="w-16 h-16 bg-white rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                  <img 
                    src={subscription.image_url} 
                    alt={subscription.title}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg border flex items-center justify-center hover:shadow-md transition-shadow">
                  <ImageIcon className="h-8 w-8 text-gray-400" />
                </div>
              )}
            </div>

            {/* Title and Status */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {subscription.title}
                  </h3>
                  {/* Status - Clickable */}
                  <button
                    onClick={handleToggleStatus}
                    className={`text-sm font-medium mt-1 hover:underline transition-colors rounded-md px-1 py-0.5 -mx-1 ${
                      subscription.status === 'active' ? 'text-green-600 hover:text-green-700 hover:bg-green-50' :
                      subscription.status === 'paused' ? 'text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50' :
                      'text-red-600 hover:text-red-700 hover:bg-red-50'
                    }`}
                  >
                    {subscription.status === 'active' ? '● Active' :
                     subscription.status === 'paused' ? '● Paused' :
                     '● Error'}
                  </button>
                </div>
                
                {/* Settings Button */}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsSettingsOpen(true)}
                  className="opacity-60 hover:opacity-100 transition-opacity"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Statistics Row - 3 columns */}
          <div className="flex items-center justify-between text-sm">
            {/* Issues Count - Clickable */}
            <button
              onClick={handleFilterBySource}
              className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors rounded-md px-2 py-1 -mx-2 -my-1 hover:bg-blue-50"
            >
              <BarChart3 className="h-4 w-4 text-gray-500 transition-colors" />
              <div>
                <span className="font-medium">{stats.totalIssues}</span>
                <span className="text-gray-600 ml-1 transition-colors">Issues</span>
              </div>
            </button>
            
            {/* Weekly Average */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <div>
                <span className="font-medium">{stats.weeklyAverage}</span>
                <span className="text-gray-600 ml-1">/week</span>
              </div>
            </div>
            
            {/* Last Issue - Clickable */}
            {stats.lastIssueDate && (
              <button
                onClick={handleOpenLatestIssue}
                className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors rounded-md px-2 py-1 -mx-2 -my-1 hover:bg-blue-50"
              >
                <Clock className="h-4 w-4 text-gray-500 transition-colors" />
                <span className="text-gray-600 transition-colors">
                  {getRelativeTime(stats.lastIssueDate)}
                </span>
              </button>
            )}
          </div>

          {/* Description (if available) */}
          {stats.description && (
            <p className="text-sm text-gray-700 mb-4 line-clamp-2">
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
