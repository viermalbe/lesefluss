'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, X, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

interface ImageUploadProps {
  currentImageUrl?: string
  onImageChange: (imageUrl: string | null) => void
  disabled?: boolean
}

export function ImageUpload({ currentImageUrl, onImageChange, disabled = false }: ImageUploadProps) {
  const [imageUrl, setImageUrl] = useState(currentImageUrl || '')
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUrlChange = (url: string) => {
    setImageUrl(url)
    onImageChange(url || null)
  }

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error('Image size must be less than 5MB')
      return
    }

    setIsUploading(true)
    
    try {
      // For now, we'll use a simple base64 data URL
      // In production, you'd upload to a service like Supabase Storage or Cloudinary
      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        handleUrlChange(dataUrl)
        toast.success('Image uploaded successfully')
        setIsUploading(false)
      }
      reader.onerror = () => {
        toast.error('Failed to upload image')
        setIsUploading(false)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload image')
      setIsUploading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const handleRemoveImage = () => {
    setImageUrl('')
    onImageChange(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4">
      <Label htmlFor="source-image">Source Image</Label>
      
      {/* Current Image Preview */}
      {imageUrl && (
        <div className="relative inline-block">
          <img 
            src={imageUrl} 
            alt="Source preview" 
            className="w-20 h-20 object-cover rounded border border-gray-200"
            onError={() => {
              toast.error('Failed to load image')
              handleRemoveImage()
            }}
          />
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
            onClick={handleRemoveImage}
            disabled={disabled}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* URL Input */}
      <div className="space-y-2">
        <Label htmlFor="image-url" className="text-sm">Image URL</Label>
        <div className="flex gap-2">
          <Input
            id="image-url"
            type="url"
            placeholder="https://example.com/image.jpg"
            value={imageUrl}
            onChange={(e) => handleUrlChange(e.target.value)}
            disabled={disabled}
            className="flex-1"
          />
          {imageUrl && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.open(imageUrl, '_blank')}
              disabled={disabled}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* File Upload */}
      <div className="space-y-2">
        <Label className="text-sm">Or upload an image</Label>
        <div className="flex gap-2">
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={disabled || isUploading}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
          >
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? 'Uploading...' : 'Browse'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Max file size: 5MB. Supported formats: JPG, PNG, GIF, WebP
        </p>
      </div>
    </div>
  )
}
