'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ImageUpload } from './image-upload'
import { 
  Copy, 
  ExternalLink, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  Pause, 
  Play,
  Mail,
  Image as ImageIcon,
  Settings
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'

interface SourceSettingsModalProps {
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
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
  onDelete: (id: string, title: string) => void
}

export function SourceSettingsModal({ 
  subscription, 
  isOpen, 
  onClose, 
  onUpdate, 
  onDelete 
}: SourceSettingsModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(subscription.title)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isEditingImage, setIsEditingImage] = useState(false)
  const [editImageUrl, setEditImageUrl] = useState(subscription.image_url || '')

  // Extract feed ID from Kill the Newsletter URL
  const getFeedId = () => {
    const match = subscription.feed_url.match(/\/feeds\/([^.]+)(?:\.xml)?$/)
    return match ? match[1] : null
  }

  const handleOpenFeedSettings = () => {
    const feedId = getFeedId()
    if (feedId) {
      window.open(`https://kill-the-newsletter.com/feeds/${feedId}`, '_blank')
    } else {
      toast.error('Could not extract feed ID from URL')
    }
  }

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(subscription.ktln_email)
      toast.success('Email address copied to clipboard!')
    } catch (err) {
      toast.error('Failed to copy email address')
    }
  }

  const handleUpdateTitle = async () => {
    if (!editTitle.trim()) {
      toast.error('Title cannot be empty')
      return
    }

    setIsUpdating(true)
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ title: editTitle.trim() })
        .eq('id', subscription.id)

      if (error) {
        toast.error(`Failed to update title: ${error.message}`)
        return
      }

      toast.success('Title updated successfully')
      setIsEditing(false)
      onUpdate()
    } catch (error: any) {
      toast.error(`Failed to update title: ${error.message}`)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCancelEdit = () => {
    setEditTitle(subscription.title)
    setIsEditing(false)
  }

  const handleToggleStatus = async () => {
    const newStatus = subscription.status === 'active' ? 'paused' : 'active'
    
    setIsUpdating(true)
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
    } finally {
      setIsUpdating(false)
    }
  }

  const handleUpdateImage = async () => {
    setIsUpdating(true)
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ image_url: editImageUrl || null } as any)
        .eq('id', subscription.id)

      if (error) {
        toast.error(`Failed to update image: ${error.message}`)
        return
      }

      toast.success('Source image updated successfully')
      setIsEditingImage(false)
      onUpdate()
    } catch (error: any) {
      toast.error(`Failed to update image: ${error.message}`)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCancelImageEdit = () => {
    setEditImageUrl(subscription.image_url || '')
    setIsEditingImage(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Source Settings
          </DialogTitle>
          <DialogDescription>
            Manage technical settings for {subscription.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Title Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Title</label>
              {!isEditing && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditing(true)}
                  className="text-xs"
                >
                  <Edit2 className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              )}
            </div>
            
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  disabled={isUpdating}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  onClick={handleUpdateTitle}
                  disabled={isUpdating}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancelEdit}
                  disabled={isUpdating}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <p className="text-sm bg-muted p-2 rounded">{subscription.title}</p>
            )}
          </div>

          {/* Status Section */}
          <div>
            <label className="text-sm font-medium mb-2 block">Status</label>
            <div className="flex items-center gap-2">
              <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                {subscription.status}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleStatus}
                disabled={isUpdating}
                className={subscription.status === 'active' ? 'text-orange-600 hover:text-orange-700' : 'text-green-600 hover:text-green-700'}
              >
                {subscription.status === 'active' ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Activate
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Email Section */}
          <div>
            <label className="text-sm font-medium mb-2 block flex items-center gap-1">
              <Mail className="h-3 w-3" />
              Email Address
            </label>
            <div className="flex items-center gap-2">
              <p className="text-sm font-mono bg-muted p-2 rounded flex-1 break-all">
                {subscription.ktln_email}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyEmail}
                className="shrink-0"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Image Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium flex items-center gap-1">
                <ImageIcon className="h-3 w-3" />
                Source Image
              </label>
              {!isEditingImage && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditingImage(true)}
                  className="text-xs"
                >
                  <Edit2 className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              )}
            </div>
            
            {isEditingImage ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={editImageUrl}
                    onChange={(e) => setEditImageUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    disabled={isUpdating}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    onClick={handleUpdateImage}
                    disabled={isUpdating}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCancelImageEdit}
                    disabled={isUpdating}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {editImageUrl && (
                  <img 
                    src={editImageUrl} 
                    alt="Preview" 
                    className="w-16 h-16 object-cover rounded border"
                    onError={() => toast.error('Invalid image URL')}
                  />
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {subscription.image_url ? (
                  <img 
                    src={subscription.image_url} 
                    alt={subscription.title} 
                    className="w-12 h-12 object-cover rounded border"
                  />
                ) : (
                  <div className="w-12 h-12 bg-muted rounded border flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <span className="text-sm text-muted-foreground">
                  {subscription.image_url ? 'Custom image set' : 'No custom image'}
                </span>
              </div>
            )}
          </div>

          {/* Actions Section */}
          <div className="border-t pt-4">
            <label className="text-sm font-medium mb-3 block">Actions</label>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" asChild>
                <a href={subscription.feed_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  RSS Feed
                </a>
              </Button>
              
              {getFeedId() && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenFeedSettings}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Feed Settings
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  onClose()
                  onDelete(subscription.id, subscription.title)
                }}
                disabled={isUpdating}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Source
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
