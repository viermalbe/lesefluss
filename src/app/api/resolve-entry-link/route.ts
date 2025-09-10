import { NextRequest, NextResponse } from 'next/server'
import { XMLParser } from 'fast-xml-parser'

// Helper to fetch and parse an Atom/RSS feed directly (server-side, no CORS)
async function fetchAndParseFeed(feedUrl: string) {
  const res = await fetch(feedUrl, { headers: { 'User-Agent': 'Lesefluss/1.0' } })
  if (!res.ok) throw new Error(`Failed to fetch feed: ${res.status}`)
  const text = await res.text()
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })
  const xml = parser.parse(text)
  return xml
}

function getText(v: any): string {
  if (!v) return ''
  if (typeof v === 'string') return v
  if ((v as any)['#text']) return String((v as any)['#text'])
  return String(v)
}

function norm(s?: string) {
  return (s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export async function POST(req: NextRequest) {
  try {
    const { feedUrl, title, publishedAt } = await req.json()
    if (!feedUrl || (!title && !publishedAt)) {
      return NextResponse.json({ error: 'feedUrl and one of title/publishedAt required' }, { status: 400 })
    }

    const xml = await fetchAndParseFeed(feedUrl)

    // Detect Atom vs RSS and build a flat list
    let entries: Array<{ title: string; link?: string; publishedAt?: string; id?: string }> = []
    if ((xml as any).feed?.entry) {
      const list = Array.isArray((xml as any).feed.entry) ? (xml as any).feed.entry : [(xml as any).feed.entry]
      entries = list.map((e: any) => ({
        title: getText(e.title),
        // prefer HTML link if multiple
        link: Array.isArray(e.link)
          ? (e.link.find((l: any) => norm(l['@_type']) === 'text/html')?.['@_href'] || e.link[0]?.['@_href'] || e.link[0])
          : (e.link?.['@_href'] || e.link),
        publishedAt: e.published || e.updated,
        id: e.id
      }))
    } else if ((xml as any).rss?.channel?.item || (xml as any).channel?.item) {
      const channel = (xml as any).rss?.channel || (xml as any).channel
      const list = Array.isArray(channel.item) ? channel.item : [channel.item]
      entries = list.map((i: any) => ({
        title: getText(i.title),
        link: getText(i.link),
        publishedAt: i.pubDate || i.date,
        id: getText(i.guid)
      }))
    }

    // Try title/id match (robust)
    let match: any = undefined
    const tNorm = norm(title)
    if (tNorm) {
      match = entries.find(e => norm(e.title) === tNorm)
      if (!match) match = entries.find(e => norm(e.title).startsWith(tNorm))
      if (!match) match = entries.find(e => norm(e.title).includes(tNorm))
    }

    // Fallback: match by published date proximity
    if (!match && publishedAt) {
      const target = new Date(publishedAt).getTime()
      let best: any = null
      let bestDiff = Number.MAX_SAFE_INTEGER
      for (const e of entries) {
        if (!e.publishedAt) continue
        const diff = Math.abs(new Date(e.publishedAt).getTime() - target)
        if (diff < bestDiff) { best = e; bestDiff = diff }
      }
      match = best || undefined
    }

    if (!match?.link) {
      return NextResponse.json({ error: 'No link found' }, { status: 404 })
    }

    return NextResponse.json({ link: match.link })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to resolve link' }, { status: 500 })
  }
}
