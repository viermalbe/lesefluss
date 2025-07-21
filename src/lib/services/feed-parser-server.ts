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
    
    if (isAtom) {
      return parseAtomFeed(xmlDoc)
    } else if (isRss) {
      return parseRssFeed(xmlDoc)
    } else {
      throw new Error('Unknown feed format - not RSS or Atom')
    }
    
  } catch (error: any) {
    console.error('Feed parsing error:', error)
    throw new Error(`Feed parsing failed: ${error.message}`)
  }
}

function parseAtomFeed(xmlDoc: any): ParsedFeed {
  const feed = xmlDoc.feed
  const title = getTextContent(feed.title) || 'Untitled Feed'
  const description = getTextContent(feed.subtitle) || getTextContent(feed.summary)
  
  const entries: FeedEntry[] = []
  const feedEntries = Array.isArray(feed.entry) ? feed.entry : (feed.entry ? [feed.entry] : [])
  
  for (const entry of feedEntries) {
    try {
      const entryTitle = getTextContent(entry.title) || 'Untitled'
      const content = getTextContent(entry.content) || getTextContent(entry.summary) || ''
      const link = entry.link?.['@_href'] || entry.link || ''
      const published = entry.published || entry.updated || new Date().toISOString()
      const guid = entry.id || generateGuidHash(entryTitle, published)
      const author = getTextContent(entry.author?.name) || getTextContent(entry.author)
      
      entries.push({
        guid,
        title: entryTitle,
        content,
        published_at: new Date(published).toISOString(),
        link,
        author
      })
    } catch (error) {
      console.error('Error parsing Atom entry:', error)
    }
  }
  
  return {
    title,
    description,
    entries: entries.slice(0, 50), // Limit to 50 entries
    last_updated: new Date().toISOString()
  }
}

function parseRssFeed(xmlDoc: any): ParsedFeed {
  const channel = xmlDoc.rss?.channel || xmlDoc.channel
  if (!channel) {
    throw new Error('Invalid RSS format - no channel found')
  }
  
  const title = getTextContent(channel.title) || 'Untitled Feed'
  const description = getTextContent(channel.description)
  
  const entries: FeedEntry[] = []
  const items = Array.isArray(channel.item) ? channel.item : (channel.item ? [channel.item] : [])
  
  for (const item of items) {
    try {
      const entryTitle = getTextContent(item.title) || 'Untitled'
      const content = getTextContent(item.description) || getTextContent(item['content:encoded']) || ''
      const link = getTextContent(item.link) || ''
      const published = item.pubDate || item.date || new Date().toISOString()
      const guid = getTextContent(item.guid) || generateGuidHash(entryTitle, published)
      const author = getTextContent(item.author) || getTextContent(item['dc:creator'])
      
      entries.push({
        guid,
        title: entryTitle,
        content,
        published_at: new Date(published).toISOString(),
        link,
        author
      })
    } catch (error) {
      console.error('Error parsing RSS item:', error)
    }
  }
  
  return {
    title,
    description,
    entries: entries.slice(0, 50), // Limit to 50 entries
    last_updated: new Date().toISOString()
  }
}

function getTextContent(value: any): string {
  if (typeof value === 'string') {
    return value.trim()
  }
  if (value && typeof value === 'object') {
    if (value['#text']) {
      return value['#text'].toString().trim()
    }
    if (typeof value.toString === 'function') {
      return value.toString().trim()
    }
  }
  return ''
}

export function generateGuidHash(title: string, publishedAt: string): string {
  const content = `${title}-${publishedAt}`
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36)
}
