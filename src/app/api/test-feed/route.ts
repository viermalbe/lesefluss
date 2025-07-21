import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { feedUrl } = await request.json()
    
    if (!feedUrl) {
      return NextResponse.json(
        { error: 'Feed URL is required' },
        { status: 400 }
      )
    }
    
    console.log(`🧪 Testing feed URL: ${feedUrl}`)
    
    // Test direct fetch
    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Lesefluss/1.0; +https://lesefluss.app/bot)',
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml',
      }
    })
    
    const isSuccess = response.ok
    const statusCode = response.status
    const contentType = response.headers.get('content-type')
    
    let content = ''
    let contentLength = 0
    
    if (isSuccess) {
      content = await response.text()
      contentLength = content.length
    } else {
      content = await response.text().catch(() => 'No response body')
    }
    
    console.log(`📊 Test result: ${statusCode} (${isSuccess ? 'SUCCESS' : 'FAILED'})`)
    console.log(`📏 Content length: ${contentLength}`)
    console.log(`📄 Content type: ${contentType}`)
    
    return NextResponse.json({
      success: isSuccess,
      status: statusCode,
      contentType,
      contentLength,
      preview: content.substring(0, 500), // First 500 chars
      isKTLNFeed: feedUrl.includes('kill-the-newsletter.com'),
      timestamp: new Date().toISOString()
    })
    
  } catch (error: any) {
    console.error('🚨 Feed test error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
}
