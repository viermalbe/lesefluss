import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'

// Initialize Supabase client with service role for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const IMAGES_BUCKET = 'images'

export async function POST(request: NextRequest) {
  try {
    // Check if request is multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const path = formData.get('path') as string || 'uploads'

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size exceeds 5MB limit' },
        { status: 400 }
      )
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Only image files are allowed' },
        { status: 400 }
      )
    }

    // Generate a unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${uuidv4()}.${fileExt}`
    const fullPath = `${path}/${fileName}`

    // Ensure bucket exists
    const { data: buckets } = await supabaseAdmin.storage.listBuckets()
    const bucketExists = buckets?.some(bucket => bucket.name === IMAGES_BUCKET)
    
    if (!bucketExists) {
      // Create bucket if it doesn't exist
      const { error } = await supabaseAdmin.storage.createBucket(IMAGES_BUCKET, {
        public: true, // Make bucket publicly accessible
        fileSizeLimit: 5 * 1024 * 1024, // 5MB limit
      })
      
      if (error) {
        console.error('Error creating images bucket:', error)
        return NextResponse.json(
          { error: 'Failed to create storage bucket' },
          { status: 500 }
        )
      }
    }

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    // Upload file
    const { data, error } = await supabaseAdmin.storage
      .from(IMAGES_BUCKET)
      .upload(fullPath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      })
    
    if (error) {
      console.error('Error uploading image:', error)
      return NextResponse.json(
        { error: 'Failed to upload image' },
        { status: 500 }
      )
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(IMAGES_BUCKET)
      .getPublicUrl(data.path)
    
    return NextResponse.json({ url: publicUrl })
  } catch (error) {
    console.error('Error in image upload API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
