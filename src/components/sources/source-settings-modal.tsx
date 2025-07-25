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
import { uploadImage } from '@/lib/utils/image-utils'
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

  const handleUpdateImage = async (imageUrl: string | null) => {
    setIsUpdating(true)
    try {
      // Check if we're removing the image or updating it
      const action = imageUrl ? 'update' : 'remove'
      
      console.log(`Updating subscription ${subscription.id} with image_url:`, imageUrl)
      
      const { error } = await supabase
        .from('subscriptions')
        .update({ image_url: imageUrl })
        .eq('id', subscription.id)

      if (error) {
        toast.error(`Failed to ${action} image: ${error.message}`)
        return
      }

      toast.success(`Source image ${action}d successfully`)
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
              <label className="text-sm font-medium">Source Image</label>
              {!isEditingImage && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsEditingImage(true);
                    // Initialize with current image URL
                    setEditImageUrl(subscription.image_url || '');
                  }}
                  className="text-xs"
                >
                  <Edit2 className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              )}
            </div>
            
            {isEditingImage ? (
              <div className="space-y-3">
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium">Bild hochladen:</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCancelImageEdit}
                      disabled={isUpdating}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Image Upload Component */}
                  <div className="border rounded p-3">
                    {/* Current Image Preview */}
                    {editImageUrl ? (
                      <div className="mb-3">
                        <p className="text-sm font-medium mb-1">Aktuelles Bild:</p>
                        <div className="relative inline-block">
                          <img 
                            src={editImageUrl} 
                            alt="Preview" 
                            className="w-16 h-16 object-contain rounded border border-gray-200"
                            onError={() => {
                              toast.error('Failed to load image');
                              setEditImageUrl('');
                            }}
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                            onClick={() => {
                              // Clear image URL locally
                              setEditImageUrl('');
                              // Update in database
                              handleUpdateImage(null);
                            }}
                            disabled={isUpdating}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mb-3">
                        <p className="text-sm font-medium mb-1">Kein Bild ausgewählt</p>
                      </div>
                    )}
                    
                    {/* File Upload Input */}
                    <div>
                      <label htmlFor="image-upload" className="text-sm font-medium block mb-1">
                        Bild vom Computer hochladen:
                      </label>
                      <input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          // Validate file
                          if (!file.type.startsWith('image/')) {
                            toast.error('Please select an image file');
                            return;
                          }
                          
                          if (file.size > 5 * 1024 * 1024) { // 5MB limit
                            toast.error('Image size must be less than 5MB');
                            return;
                          }
                          
                          setIsUpdating(true);
                          try {
                            // Upload to Supabase Storage using our utility function
                            const path = 'sources';
                            const imageUrl = await uploadImage(file, path);
                            
                            if (imageUrl) {
                              // Update local state
                              setEditImageUrl(imageUrl);
                              // Update in database
                              await handleUpdateImage(imageUrl);
                              toast.success('Image uploaded successfully');
                            } else {
                              toast.error('Failed to upload image');
                            }
                          } catch (error) {
                            console.error('Upload error:', error);
                            toast.error('Failed to upload image');
                          } finally {
                            setIsUpdating(false);
                          }
                        }}
                        disabled={isUpdating}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {subscription.image_url ? (
                  <img 
                    src={subscription.image_url} 
                    alt={subscription.title} 
                    className="w-12 h-12 object-contain rounded border"
                    onError={() => {
                      toast.error('Failed to load image');
                    }}
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
