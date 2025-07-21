// RSS/Atom feed parsing service
import { XMLParser } from 'fast-xml-parser'

export interface FeedEntry {
  guid: string
  title: string
  content: string
  published_at: string
  link?: string
  author?: string
}

export interface ParsedFeed {
  title: string
  description?: string
  entries: FeedEntry[]
  last_updated: string
}

export async function parseFeed(feedUrl: string, baseUrl?: string): Promise<ParsedFeed> {
  try {
    // Use proxy API to avoid CORS issues
    // In cron job context, we need absolute URL
    const apiUrl = baseUrl 
      ? `${baseUrl}/api/fetch-feed`
      : '/api/fetch-feed'
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ feedUrl }),
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || `Failed to fetch feed: ${response.status}`)
    }
    
    const { content: feedText } = await response.json()
    
    // Parse XML using fast-xml-parser (server-compatible)
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      parseAttributeValue: true,
      trimValues: true
    })
    
    let xmlDoc
    try {
      xmlDoc = parser.parse(feedText)
    } catch (error) {
      throw new Error('Invalid XML format')
    }
    
    // Detect feed type (Atom or RSS)
    const isAtom = xmlDoc.feed !== undefined
    const isRss = xmlDoc.rss !== undefined
    
    console.log('Feed detection:', {
      hasFeedElement: !!feedElement,
      hasRssElement: !!rssElement,
      hasChannelElement: !!channelElement,
      feedNamespace: feedElement?.getAttribute('xmlns'),
      rootElementName: xmlDoc.documentElement?.tagName
    })
    
    const isAtom = feedElement !== null
    const isRss = rssElement !== null || channelElement !== null
    
    if (!isAtom && !isRss) {
      console.error('Unsupported feed format. XML content:', feedText.substring(0, 500))
      throw new Error('Unsupported feed format')
    }
    
    if (isAtom) {
      console.log('Parsing as Atom feed')
      return parseAtomFeed(xmlDoc)
    } else {
      console.log('Parsing as RSS feed')
      return parseRssFeed(xmlDoc)
    }
  } catch (error) {
    throw new Error(`Feed parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

function parseAtomFeed(xmlDoc: Document): ParsedFeed {
  const feed = xmlDoc.querySelector('feed')
  if (!feed) throw new Error('Invalid Atom feed')
  
  const title = feed.querySelector('title')?.textContent || 'Untitled Feed'
  const updated = feed.querySelector('updated')?.textContent || new Date().toISOString()
  
  const entries: FeedEntry[] = []
  const entryElements = feed.querySelectorAll('entry')
  
  entryElements.forEach(entry => {
    const id = entry.querySelector('id')?.textContent
    const entryTitle = entry.querySelector('title')?.textContent || 'Untitled'
    
    // Extract content - handle both text and HTML content
    const contentElement = entry.querySelector('content')
    const summaryElement = entry.querySelector('summary')
    let content = ''
    
    if (contentElement) {
      // Check if content type is HTML
      const contentType = contentElement.getAttribute('type')
      if (contentType === 'html' || contentType === 'xhtml') {
        content = contentElement.textContent || contentElement.innerHTML || ''
      } else {
        content = contentElement.textContent || ''
      }
    } else if (summaryElement) {
      content = summaryElement.textContent || summaryElement.innerHTML || ''
    }
    
    const published = entry.querySelector('published')?.textContent || 
                     entry.querySelector('updated')?.textContent || 
                     new Date().toISOString()
    const link = entry.querySelector('link[rel="alternate"]')?.getAttribute('href') ||
                entry.querySelector('link')?.getAttribute('href') || undefined
    const author = entry.querySelector('author name')?.textContent ||
                  entry.querySelector('author email')?.textContent || undefined
    
    if (id) {
      entries.push({
        guid: id,
        title: entryTitle,
        content: decodeHtmlEntities(content),
        published_at: published,
        link,
        author
      })
    }
  })
  
  return {
    title,
    entries,
    last_updated: updated
  }
}

function parseRssFeed(xmlDoc: Document): ParsedFeed {
  const channel = xmlDoc.querySelector('channel')
  if (!channel) throw new Error('Invalid RSS feed')
  
  const title = channel.querySelector('title')?.textContent || 'Untitled Feed'
  const description = channel.querySelector('description')?.textContent
  const lastBuildDate = channel.querySelector('lastBuildDate')?.textContent || new Date().toISOString()
  
  const entries: FeedEntry[] = []
  const itemElements = channel.querySelectorAll('item')
  
  itemElements.forEach(item => {
    const guid = item.querySelector('guid')?.textContent
    const itemTitle = item.querySelector('title')?.textContent || 'Untitled'
    const content = item.querySelector('description')?.textContent || 
                   item.querySelector('content:encoded')?.textContent || ''
    const pubDate = item.querySelector('pubDate')?.textContent || new Date().toISOString()
    const link = item.querySelector('link')?.textContent || undefined
    const author = item.querySelector('author')?.textContent ||
                  item.querySelector('dc:creator')?.textContent || undefined
    
    // Generate GUID if not present
    const entryGuid = guid || generateGuidHash(itemTitle, pubDate)
    
    entries.push({
      guid: entryGuid,
      title: itemTitle,
      content: decodeHtmlEntities(content),
      published_at: pubDate,
      link,
      author
    })
  })
  
  return {
    title,
    description,
    entries,
    last_updated: lastBuildDate
  }
}

function decodeHtmlEntities(text: string): string {
  const textarea = document.createElement('textarea')
  textarea.innerHTML = text
  return textarea.value
}

export function generateGuidHash(title: string, publishedAt: string): string {
  // Simple hash function for GUID generation
  const combined = `${title}-${publishedAt}`
  let hash = 0
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return hash.toString(36)
}
