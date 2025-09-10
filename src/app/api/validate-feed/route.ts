import { NextRequest, NextResponse } from 'next/server'
import { XMLParser } from 'fast-xml-parser'

export async function POST(req: NextRequest) {
  try {
    const { feedUrl } = await req.json()
    if (!feedUrl || typeof feedUrl !== 'string') {
      return NextResponse.json({ error: 'feedUrl is required' }, { status: 400 })
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    let xml = ''
    try {
      const res = await fetch(feedUrl, { headers: { 'User-Agent': 'Lesefluss/1.0' }, signal: controller.signal })
      clearTimeout(timeout)
      if (!res.ok) {
        // Gracefully allow client to proceed without metadata
        return NextResponse.json({ ok: false, title: '', type: 'unknown' })
      }
      xml = await res.text()
    } catch (e) {
      clearTimeout(timeout)
      // Network error or timeout: return minimal info but ok:false
      return NextResponse.json({ ok: false, title: '', type: 'unknown' })
    }
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', textNodeName: '#text' })
    let doc: any
    try { doc = parser.parse(xml) } catch { return NextResponse.json({ ok: false, title: '', type: 'unknown' }) }

    let title = ''
    let type: 'rss' | 'atom' | 'unknown' = 'unknown'
    let imageUrl: string | undefined
    let siteUrl: string | undefined

    if (doc.feed) {
      type = 'atom'
      title = (doc.feed.title && (doc.feed.title['#text'] || String(doc.feed.title))) || ''
      imageUrl = doc.feed.icon || doc.feed.logo
      // Try site link
      const links = Array.isArray(doc.feed.link) ? doc.feed.link : [doc.feed.link].filter(Boolean)
      const alt = links?.find((l: any) => (l?.['@_rel'] || '').toLowerCase() === 'alternate')
      siteUrl = alt?.['@_href'] || undefined
    } else if (doc.rss?.channel || doc.channel) {
      type = 'rss'
      const ch = doc.rss?.channel || doc.channel
      title = (ch.title && (ch.title['#text'] || String(ch.title))) || ''
      imageUrl = ch.image?.url || ch['itunes:image']?.['@_href'] || ch['image:href']
      siteUrl = ch.link || undefined
    }

    // Fallback favicon guess if no explicit image
    if (!imageUrl && siteUrl) {
      try {
        const u = new URL(siteUrl)
        imageUrl = `${u.origin}/favicon.ico`
      } catch {}
    }

    return NextResponse.json({ ok: true, title, type, imageUrl, siteUrl })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Validation failed' }, { status: 500 })
  }
}
