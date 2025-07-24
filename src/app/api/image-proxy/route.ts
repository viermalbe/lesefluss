import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with service role for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const IMAGES_BUCKET = 'images'
const CACHE_DURATION = 60 * 60 * 24 * 7 // 7 days in seconds

// Cache for 1 day at the edge
export const runtime = 'edge'
export const revalidate = 86400 // 24 hours

// Use a module-level variable to track bucket check status
// This avoids TypeScript issues with global variables
let bucketChecked = false

export async function GET(request: NextRequest) {
  try {
    // Get URL from query parameter
    const url = request.nextUrl.searchParams.get('url')
    const sourceId = request.nextUrl.searchParams.get('sourceId')
    
    if (!url) {
      return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 })
    }
    
    // Check if this is a data URL (base64 encoded image)
    // If so, return it directly to avoid 431 errors from large headers
    if (url.startsWith('data:image/')) {
      return NextResponse.redirect(url)
    }
    
    // Generate a consistent path based on the URL
    const urlHash = Buffer.from(url).toString('base64')
      .replace(/[+/=]/g, '')
      .substring(0, 16)
    
    const path = sourceId ? `sources/${sourceId}` : 'external'
    const fileName = `${urlHash}.jpg` // Convert to JPEG for consistency
    const fullPath = `${path}/${fileName}`
    
    // First, try to get the public URL directly
    const { data: publicUrlData } = supabaseAdmin.storage
      .from(IMAGES_BUCKET)
      .getPublicUrl(fullPath)
    
    // Check if the file exists by making a HEAD request
    try {
      const checkResponse = await fetch(publicUrlData.publicUrl, { method: 'HEAD' })
      if (checkResponse.ok) {
        // File exists, redirect to it
        return NextResponse.redirect(publicUrlData.publicUrl)
      }
    } catch (error) {
      // Error checking file existence, continue to fetch and cache
      console.log('File check error, will attempt to cache:', error)
    }
    
    // Ensure bucket exists - only check once in a while using a simple caching mechanism
    if (!bucketChecked) {
      try {
        const { data: buckets } = await supabaseAdmin.storage.listBuckets()
        const bucketExists = buckets?.some(bucket => bucket.name === IMAGES_BUCKET)
        
        if (!bucketExists) {
          await supabaseAdmin.storage.createBucket(IMAGES_BUCKET, {
            public: true,
            fileSizeLimit: 5 * 1024 * 1024, // 5MB limit
          })
        }
        
        // Set the flag to avoid checking again
        bucketChecked = true
      } catch (error) {
        console.error('Error checking bucket:', error)
        // Continue anyway
      }
    }
    
    // Fetch the external image with a timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
    
    try {
      const response = await fetch(url, { 
        signal: controller.signal,
        headers: {
          // Add common headers to improve cache hit rates
          'User-Agent': 'Mozilla/5.0 Lesefluss Image Proxy',
          'Accept': 'image/*'
        }
      })
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        return NextResponse.json(
          { error: `Failed to fetch image: ${response.status} ${response.statusText}` },
          { status: response.status }
        )
      }
      
      // Get the image as blob
      const imageBlob = await response.blob()
      
      // Upload to Supabase Storage with retry logic
      let uploadAttempts = 0
      let uploadSuccess = false
      let data, error
      
      while (uploadAttempts < 3 && !uploadSuccess) {
        uploadAttempts++
        
        const uploadResult = await supabaseAdmin.storage
          .from(IMAGES_BUCKET)
          .upload(fullPath, imageBlob, {
            contentType: imageBlob.type || 'image/jpeg',
            cacheControl: `max-age=${CACHE_DURATION}`,
            upsert: true // Overwrite if exists
          })
        
        data = uploadResult.data
        error = uploadResult.error
        
        if (!error) {
          uploadSuccess = true
        } else {
          console.error(`Upload attempt ${uploadAttempts} failed:`, error)
          // Wait a bit before retrying
          if (uploadAttempts < 3) await new Promise(r => setTimeout(r, 500))
        }
      }
      
      if (!uploadSuccess) {
        console.error('All upload attempts failed')
        // If we can't cache after multiple attempts, redirect to original URL
        return NextResponse.redirect(url)
      }
      
      // Ensure data is not null before accessing its properties
      if (!data || !data.path) {
        console.error('Upload data is null or missing path')
        return NextResponse.redirect(url)
      }
      
      // Get public URL
      const { data: publicUrlData } = supabaseAdmin.storage
        .from(IMAGES_BUCKET)
        .getPublicUrl(data.path)
        
      // Check if we have a valid public URL
      if (!publicUrlData || !publicUrlData.publicUrl) {
        console.error('Failed to get public URL')
        return NextResponse.redirect(url)
      }
      
      // Redirect to the cached image
      return NextResponse.redirect(publicUrlData.publicUrl)
    } catch (error) {
      clearTimeout(timeoutId)
      console.error('Error in image proxy:', error)
      
      // If there's an error (like timeout), redirect to the original URL
      return NextResponse.redirect(url)
    }
    
  } catch (error) {
    console.error('Error in image proxy:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
