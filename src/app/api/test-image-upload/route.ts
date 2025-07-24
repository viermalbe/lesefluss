import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with service role for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export async function GET(request: NextRequest) {
  try {
    // Test the image upload and proxy functionality
    const testResults = {
      imageUpload: {
        status: 'Not tested yet',
        message: ''
      },
      imageProxy: {
        status: 'Not tested yet',
        message: ''
      },
      dataUrlHandling: {
        status: 'Not tested yet',
        message: ''
      }
    }

    // Test if the images bucket exists
    const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets()
    
    if (bucketsError) {
      testResults.imageUpload.status = 'Error'
      testResults.imageUpload.message = `Failed to list buckets: ${bucketsError.message}`
      return NextResponse.json({ testResults }, { status: 500 })
    }

    const imagesBucket = buckets?.find(bucket => bucket.name === 'images')
    
    if (!imagesBucket) {
      testResults.imageUpload.status = 'Warning'
      testResults.imageUpload.message = 'Images bucket does not exist. It will be created on first upload.'
    } else {
      testResults.imageUpload.status = 'Success'
      testResults.imageUpload.message = 'Images bucket exists'
    }

    // Test image proxy with a small external image
    const testImageUrl = 'https://picsum.photos/64/64'
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const proxyUrl = `${baseUrl}/api/image-proxy?url=${encodeURIComponent(testImageUrl)}`
    
    try {
      const proxyResponse = await fetch(proxyUrl, { method: 'HEAD' })
      
      if (proxyResponse.ok) {
        testResults.imageProxy.status = 'Success'
        testResults.imageProxy.message = `Image proxy working. Status: ${proxyResponse.status}`
      } else {
        testResults.imageProxy.status = 'Error'
        testResults.imageProxy.message = `Image proxy failed. Status: ${proxyResponse.status}`
      }
    } catch (error: any) {
      testResults.imageProxy.status = 'Error'
      testResults.imageProxy.message = `Error testing image proxy: ${error.message}`
    }

    // Test data URL handling (should bypass proxy)
    const smallDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
    const dataUrlProxyUrl = `${baseUrl}/api/image-proxy?url=${encodeURIComponent(smallDataUrl)}`
    
    try {
      const dataUrlResponse = await fetch(dataUrlProxyUrl)
      
      if (dataUrlResponse.redirected && dataUrlResponse.url === smallDataUrl) {
        testResults.dataUrlHandling.status = 'Success'
        testResults.dataUrlHandling.message = 'Data URL correctly bypassed proxy'
      } else {
        testResults.dataUrlHandling.status = 'Warning'
        testResults.dataUrlHandling.message = `Data URL handling unclear. Redirect URL: ${dataUrlResponse.url}`
      }
    } catch (error: any) {
      testResults.dataUrlHandling.status = 'Error'
      testResults.dataUrlHandling.message = `Error testing data URL handling: ${error.message}`
    }

    return NextResponse.json({ testResults }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ error: `Test failed: ${error.message}` }, { status: 500 })
  }
}
