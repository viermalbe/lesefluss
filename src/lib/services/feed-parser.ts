// Server-compatible RSS/Atom feed parsing service
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
    let feedText: string
    
    if (baseUrl) {
      // Cron job context: fetch feed directly to avoid self-referencing API calls
      // Add a cache-busting query parameter to defeat intermediary caches
      const urlObj = new URL(feedUrl)
      urlObj.searchParams.set('_', Date.now().toString())
      const directUrl = urlObj.toString()
      console.log(`🔗 Direct fetch: ${directUrl}`)
      const response = await fetch(directUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Lesefluss/1.0; +https://lesefluss.app/bot)',
          'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      feedText = await response.text()
      console.log(`✅ Direct fetch successful, length: ${feedText.length}`)
    } else {
      // Browser context: use proxy API to avoid CORS issues
      console.log(`🔄 Proxy fetch: ${feedUrl}`)
      const response = await fetch('/api/fetch-feed', {
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
      
      const { content } = await response.json()
      feedText = content
      console.log(`✅ Proxy fetch successful, length: ${feedText.length}`)
    }
    
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
    
    if (!isAtom && !isRss) {
      console.error('Unsupported feed format. Root elements:', Object.keys(xmlDoc))
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

function parseAtomFeed(xmlDoc: any): ParsedFeed {
  const feed = xmlDoc.feed
  if (!feed) throw new Error('Invalid Atom feed')
  
  const title = extractTextValue(feed.title) || 'Untitled Feed'
  const updated = extractTextValue(feed.updated) || new Date().toISOString()
  
  const entries: FeedEntry[] = []
  const entryElements = Array.isArray(feed.entry) ? feed.entry : [feed.entry].filter(Boolean)
  
  for (const entry of entryElements) {
    if (!entry) continue
    
    // Safely extract entry values with better type checking
    const entryTitle = extractTextValue(entry.title) || 'Untitled'
    const entryId = extractTextValue(entry.id) || ''
    const published = extractTextValue(entry.published) || extractTextValue(entry.updated) || new Date().toISOString()
    const link = entry.link?.['@_href'] || (Array.isArray(entry.link) ? entry.link[0]?.['@_href'] : '') || ''
    const author = extractTextValue(entry.author?.name) || extractTextValue(entry.author) || ''
    
    // Get content with robust extraction
    let content = ''
    if (entry.content) {
      content = extractTextValue(entry.content)
    } else if (entry.summary) {
      content = extractTextValue(entry.summary)
    }
    
    entries.push({
      guid: entryId || generateGuidHash(entryTitle, published),
      title: decodeHtmlEntities(entryTitle),
      content: decodeHtmlEntities(content),
      published_at: new Date(published).toISOString(),
      link: link,
      author: author
    })
  }
  
  return {
    title: decodeHtmlEntities(title),
    description: decodeHtmlEntities(extractTextValue(feed.subtitle)),
    entries,
    last_updated: new Date(updated).toISOString()
  }
}

function parseRssFeed(xmlDoc: any): ParsedFeed {
  const channel = xmlDoc.rss?.channel
  if (!channel) throw new Error('Invalid RSS feed')
  
  const title = channel.title?.['#text'] || channel.title || 'Untitled Feed'
  const description = channel.description?.['#text'] || channel.description || ''
  const lastBuildDate = channel.lastBuildDate?.['#text'] || channel.lastBuildDate || new Date().toISOString()
  
  const entries: FeedEntry[] = []
  const itemElements = Array.isArray(channel.item) ? channel.item : [channel.item].filter(Boolean)
  
  for (const item of itemElements) {
    if (!item) continue
    
    const itemTitle = item.title?.['#text'] || item.title || 'Untitled'
    const itemGuid = item.guid?.['#text'] || item.guid || ''
    const pubDate = item.pubDate?.['#text'] || item.pubDate || new Date().toISOString()
    const link = item.link?.['#text'] || item.link || ''
    const author = item.author?.['#text'] || item.author || item['dc:creator']?.['#text'] || item['dc:creator'] || ''
    
    // Get content - try description first, then content:encoded
    let content = ''
    if (item['content:encoded']) {
      content = item['content:encoded']['#text'] || item['content:encoded'] || ''
    } else if (item.description) {
      content = item.description?.['#text'] || item.description || ''
    }
    
    entries.push({
      guid: itemGuid || generateGuidHash(itemTitle, pubDate),
      title: decodeHtmlEntities(itemTitle),
      content: decodeHtmlEntities(content),
      published_at: new Date(pubDate).toISOString(),
      link: link,
      author: author
    })
  }
  
  return {
    title: decodeHtmlEntities(title),
    description: decodeHtmlEntities(description),
    entries,
    last_updated: new Date(lastBuildDate).toISOString()
  }
}

// Helper function to safely extract text values from XML parser objects
function extractTextValue(value: any): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (value['#text']) return value['#text']
  if (typeof value === 'object') return String(value)
  return String(value)
}

function decodeHtmlEntities(text: any): string {
  if (!text) return ''
  
  // Ensure we have a string to work with
  const stringText = typeof text === 'string' ? text : String(text)
  
  return stringText
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

export function generateGuidHash(title: string, publishedAt: string): string {
  // Simple hash function for generating GUIDs when not provided
  const str = `${title}-${publishedAt}`
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36)
}
