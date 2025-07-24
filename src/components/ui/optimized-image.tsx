'use client'

import { useState, useEffect } from 'react'
import { getImageProxyUrl } from '@/lib/utils/image-utils'
import { ImageIcon } from 'lucide-react'

interface OptimizedImageProps {
  src?: string | null
  alt: string
  className?: string
  width?: number
  height?: number
  sourceId?: string
  fallbackIcon?: React.ReactNode
  priority?: boolean
  onLoad?: () => void
  onError?: () => void
}

export function OptimizedImage({
  src,
  alt,
  className = '',
  width,
  height,
  sourceId,
  fallbackIcon,
  priority = false,
  onLoad,
  onError
}: OptimizedImageProps) {
  const [optimizedSrc, setOptimizedSrc] = useState<string | null>(src || null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  
  // Optimize image URL when src changes
  useEffect(() => {
    let isMounted = true
    
    const optimizeImage = () => {
      if (!src) {
        setOptimizedSrc(null)
        setIsLoading(false)
        return
      }
      
      try {
        setIsLoading(true)
        // Use getImageProxyUrl instead of getOptimizedImageUrl
        // This is synchronous and doesn't require server-side caching
        const optimized = getImageProxyUrl(src, sourceId)
        
        if (isMounted) {
          setOptimizedSrc(optimized)
          setIsLoading(false)
          setHasError(false)
        }
      } catch (error) {
        console.error('Error optimizing image:', error)
        if (isMounted) {
          setOptimizedSrc(src) // Fallback to original source
          setIsLoading(false)
          setHasError(false) // Don't set error here, let the img element handle it
        }
      }
    }
    
    optimizeImage()
    
    return () => {
      isMounted = false
    }
  }, [src, sourceId])
  
  const handleError = () => {
    setHasError(true)
    if (onError) onError()
  }
  
  const handleLoad = () => {
    if (onLoad) onLoad()
  }
  
  // Default fallback icon if not provided
  const defaultFallbackIcon = fallbackIcon || (
    <ImageIcon className="w-1/2 h-1/2 text-gray-400" />
  )
  
  // Show fallback when no source or error
  if (!optimizedSrc || hasError) {
    return (
      <div 
        className={`bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center ${className}`}
        style={{ width: width ? `${width}px` : '100%', height: height ? `${height}px` : '100%' }}
      >
        {defaultFallbackIcon}
      </div>
    )
  }
  
  return (
    <>
      {isLoading && (
        <div 
          className={`bg-gray-100 animate-pulse ${className}`}
          style={{ width: width ? `${width}px` : '100%', height: height ? `${height}px` : '100%' }}
        />
      )}
      
      <img
        src={optimizedSrc}
        alt={alt}
        className={`${className} ${isLoading ? 'hidden' : ''}`}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        onLoad={handleLoad}
        onError={handleError}
      />
    </>
  )
}
