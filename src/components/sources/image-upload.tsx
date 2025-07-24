'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { uploadImage } from '@/lib/utils/image-utils'

interface ImageUploadProps {
  currentImageUrl?: string
  onImageChange: (imageUrl: string | null) => void
  disabled?: boolean
}

export function ImageUpload({ currentImageUrl, onImageChange, disabled = false }: ImageUploadProps) {
  const [imageUrl, setImageUrl] = useState(currentImageUrl || '')
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      // Upload to Supabase Storage using our utility function
      const path = 'uploads' // Store in uploads folder
      const imageUrl = await uploadImage(file, path)
      
      if (imageUrl) {
        setImageUrl(imageUrl)
        onImageChange(imageUrl)
        toast.success('Image uploaded successfully')
      } else {
        toast.error('Failed to upload image')
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload image')
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }

  const handleRemoveImage = (e: React.MouseEvent) => {
    // Prevent event bubbling
    e.preventDefault()
    e.stopPropagation()
    
    // Clear local state
    setImageUrl('')
    
    // Explicitly pass null to parent component to indicate image removal
    onImageChange(null)
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    
    console.log('Image removal requested')
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
            onError={(e) => {
              toast.error('Failed to load image')
              // Create a synthetic event for handleRemoveImage
              const syntheticEvent = new Event('error') as unknown as React.MouseEvent;
              handleRemoveImage(syntheticEvent)
            }}
          />
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
            onClick={(e) => handleRemoveImage(e)}
            disabled={disabled}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* URL Input removed - only file upload now */}

      {/* File Upload */}
      <div className="space-y-2">
        <Label className="text-sm">Upload an image</Label>
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
