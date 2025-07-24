import { supabase } from '@/lib/supabase/client'
import { v4 as uuidv4 } from 'uuid'

const IMAGES_BUCKET = 'images'
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds

/**
 * Ensures the images bucket exists in Supabase Storage
 */
export async function ensureImagesBucket() {
  try {
    // Check if bucket exists
    const { data: buckets } = await supabase.storage.listBuckets()
    const bucketExists = buckets?.some(bucket => bucket.name === IMAGES_BUCKET)
    
    if (!bucketExists) {
      // Create bucket if it doesn't exist
      const { error } = await supabase.storage.createBucket(IMAGES_BUCKET, {
        public: true, // Make bucket publicly accessible
        fileSizeLimit: 5 * 1024 * 1024, // 5MB limit
      })
      
      if (error) {
        console.error('Error creating images bucket:', error)
        return false
      }
    }
    
    return true
  } catch (error) {
    console.error('Error ensuring images bucket:', error)
    return false
  }
}

/**
 * Uploads a file to Supabase Storage via API route (to bypass RLS)
 * @param file File to upload
 * @param path Optional path within the bucket
 * @returns URL of the uploaded file or null if upload failed
 */
export async function uploadImage(file: File, path: string = 'uploads'): Promise<string | null> {
  try {
    // Create form data for the file upload
    const formData = new FormData()
    formData.append('file', file)
    formData.append('path', path)
    
    // Send the file to our API route
    const response = await fetch('/api/upload-image', {
      method: 'POST',
      body: formData,
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      console.error('Error uploading image:', errorData)
      throw new Error(errorData.error || 'Failed to upload image')
    }
    
    const data = await response.json()
    return data.url
  } catch (error) {
    console.error('Error in uploadImage:', error)
    return null
  }
}

/**
 * Fetches an external image and stores it in Supabase Storage
 * @param imageUrl URL of the external image
 * @param sourceId Optional identifier for the source (e.g., subscription ID)
 * @returns URL of the cached image or null if caching failed
 */
export async function cacheExternalImage(imageUrl: string, sourceId?: string): Promise<string | null> {
  try {
    if (!imageUrl) return null
    
    // Generate a consistent path based on the URL
    const urlHash = btoa(imageUrl).replace(/[+/=]/g, '').substring(0, 16)
    const path = sourceId ? `sources/${sourceId}` : 'external'
    const fileName = `${urlHash}.jpg` // We'll convert to JPEG for consistency
    const fullPath = `${path}/${fileName}`
    
    // Check if image already exists in cache
    const { data: existingFile } = await supabase.storage
      .from(IMAGES_BUCKET)
      .getPublicUrl(fullPath)
    
    if (existingFile) {
      // Check if file exists and is not expired
      const { data: metadata } = await supabase.storage
        .from(IMAGES_BUCKET)
        .getPublicUrl(fullPath)
      
      // If we have a valid cached version, return it
      if (metadata) {
        return metadata.publicUrl
      }
    }
    
    // Fetch the external image
    const response = await fetch(imageUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`)
    }
    
    // Get the image as blob
    const imageBlob = await response.blob()
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(IMAGES_BUCKET)
      .upload(fullPath, imageBlob, {
        contentType: 'image/jpeg',
        cacheControl: '604800', // 7 days
        upsert: true // Overwrite if exists
      })
    
    if (error) {
      console.error('Error caching external image:', error)
      return null
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(IMAGES_BUCKET)
      .getPublicUrl(data.path)
    
    return publicUrl
  } catch (error) {
    console.error('Error in cacheExternalImage:', error)
    // Return original URL as fallback
    return imageUrl
  }
}

/**
 * Deletes an image from Supabase Storage
 * @param imageUrl URL of the image to delete
 * @returns true if deletion was successful, false otherwise
 */
export async function deleteImage(imageUrl: string): Promise<boolean> {
  try {
    // Extract path from URL
    const url = new URL(imageUrl)
    const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/images\/(.+)/)
    
    if (!pathMatch || !pathMatch[1]) {
      console.error('Invalid image URL format:', imageUrl)
      return false
    }
    
    const path = pathMatch[1]
    
    // Delete file
    const { error } = await supabase.storage
      .from(IMAGES_BUCKET)
      .remove([path])
    
    if (error) {
      console.error('Error deleting image:', error)
      return false
    }
    
    return true
  } catch (error) {
    console.error('Error in deleteImage:', error)
    return false
  }
}

/**
 * Checks if a URL is a Supabase Storage URL
 * @param url URL to check
 * @returns true if URL is a Supabase Storage URL, false otherwise
 */
export function isSupabaseStorageUrl(url: string): boolean {
  try {
    return url.includes('/storage/v1/object/public/images/')
  } catch {
    return false
  }
}

/**
 * Gets the image URL, either from Supabase Storage or external source
 * If it's an external source, it will be cached in Supabase Storage
 * @param url URL of the image
 * @param sourceId Optional identifier for the source
 * @param forceCache Force caching even if URL is already a Supabase Storage URL
 * @returns URL of the image (cached if external)
 */
export async function getOptimizedImageUrl(
  url: string | null | undefined,
  sourceId?: string,
  forceCache: boolean = false
): Promise<string | null> {
  if (!url) return null
  
  // If already a Supabase Storage URL and not forcing cache, return as is
  if (isSupabaseStorageUrl(url) && !forceCache) {
    return url
  }
  
  // If it's a data URL (base64 encoded image), return as is to prevent 431 errors
  if (url.startsWith('data:image/')) {
    return url
  }
  
  // Cache external image
  return await cacheExternalImage(url, sourceId) || url
}

/**
 * Gets the image proxy URL for an image
 * This is a client-side function that doesn't actually cache the image,
 * but returns a URL that will proxy and cache the image when accessed
 * @param url URL of the image
 * @param sourceId Optional identifier for the source
 * @returns URL for the image proxy
 */
export function getImageProxyUrl(
  url: string | null | undefined,
  sourceId?: string
): string | null {
  if (!url) return null
  
  // If already a Supabase Storage URL, return as is
  if (isSupabaseStorageUrl(url)) {
    return url
  }
  
  // If it's a data URL (base64 encoded image), return as is to prevent 431 errors
  if (url.startsWith('data:image/')) {
    return url
  }
  
  // Create proxy URL without using window.location (which doesn't exist on server)
  let baseUrl = ''
  
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    baseUrl = window.location.origin
  } else {
    // Fallback for server-side rendering
    baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lesefluss.vercel.app'
  }
  
  // Create the proxy URL
  try {
    const proxyUrl = new URL(`${baseUrl}/api/image-proxy`)
    proxyUrl.searchParams.append('url', url)
    if (sourceId) {
      proxyUrl.searchParams.append('sourceId', sourceId)
    }
    return proxyUrl.toString()
  } catch (error) {
    console.error('Error creating proxy URL:', error)
    // Fallback to original URL if we can't create a proxy URL
    return url
  }
  
}
