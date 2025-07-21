import { NextRequest, NextResponse } from 'next/server'

async function fetchWithRetry(url: string, maxRetries = 3): Promise<Response> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Lesefluss/1.0; +https://lesefluss.app/bot)',
          'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml',
          'Cache-Control': 'no-cache'
        }
      })
      
      if (response.ok) {
        return response
      }
      
      // If rate limited (429), wait and retry
      if (response.status === 429 && attempt < maxRetries) {
        const waitTime = Math.pow(2, attempt) * 1000 // Exponential backoff
        console.log(`Rate limited, waiting ${waitTime}ms before retry ${attempt + 1}`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
        continue
      }
      
      // For other errors, throw immediately
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      
    } catch (error) {
      if (attempt === maxRetries) {
        throw error
      }
      
      // Wait before retry for network errors
      const waitTime = 1000 * attempt
      console.log(`Fetch attempt ${attempt} failed, retrying in ${waitTime}ms`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
  }
  
  throw new Error('Max retries exceeded')
}

export async function POST(request: NextRequest) {
  try {
    const { feedUrl } = await request.json()
    
    if (!feedUrl) {
      return NextResponse.json(
        { error: 'Feed URL is required' },
        { status: 400 }
      )
    }
    
    console.log(`Fetching feed: ${feedUrl}`)
    
    // Fetch the feed with retry logic
    const response = await fetchWithRetry(feedUrl)
    const feedText = await response.text()
    
    console.log(`Successfully fetched feed, length: ${feedText.length}`)
    
    return NextResponse.json({
      content: feedText,
      contentType: response.headers.get('content-type')
    })
    
  } catch (error: any) {
    console.error('Feed fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
