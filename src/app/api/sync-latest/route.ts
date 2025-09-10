import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseFeed, generateGuidHash } from '@/lib/services/feed-parser-server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { subscriptionId } = await req.json()
    if (!subscriptionId) {
      return NextResponse.json({ error: 'subscriptionId required' }, { status: 400 })
    }

    // Load subscription and ensure ownership
    const { data: subscription, error: subErr } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .eq('user_id', user.id)
      .single()

    if (subErr || !subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    // Parse feed (server-side)
    const parsedFeed = await parseFeed(subscription.feed_url)
    const entries = parsedFeed.entries || []
    if (entries.length === 0) {
      return NextResponse.json({ ok: true, message: 'No entries in feed' })
    }

    // Find latest by published date
    const latest = entries.reduce((acc: any, e: any) => {
      if (!acc) return e
      const da = new Date(acc.published_at || acc.updated || acc.date).getTime()
      const db = new Date(e.published_at || e.updated || e.date).getTime()
      return db > da ? e : acc
    }, null as any)

    // Resolve permalink (generic first, KTLN fallback)
    const deriveFeedId = (feedUrl?: string | null) => {
      if (!feedUrl) return null
      const m = String(feedUrl).match(/\/feeds\/([^.\/]+)(?:\.xml)?$/)
      return m ? m[1] : null
    }
    const deriveEntryId = () => {
      const fromLink = (latest.link || '').match(/\/entries\/([A-Za-z0-9_-]+)\.html/)
      if (fromLink) return fromLink[1]
      if (latest.guid) {
        const m = String(latest.guid).match(/([^:]+)$/)
        if (m) return m[1]
      }
      return null
    }
    const feedId = deriveFeedId(subscription.feed_url)
    const entryId = deriveEntryId()
    const derivedLink = feedId && entryId ? `https://kill-the-newsletter.com/feeds/${feedId}/entries/${entryId}.html` : null
    const resolvedLink = latest.link || derivedLink || null

    // Insert if not exists
    const guidHash = generateGuidHash(latest.guid, latest.published_at)
    const { data: existing } = await supabase
      .from('entries')
      .select('id')
      .eq('guid_hash', guidHash)
      .eq('subscription_id', subscription.id)
      .single()

    if (!existing) {
      const { error: insertError } = await supabase
        .from('entries')
        .insert({
          subscription_id: subscription.id,
          guid_hash: guidHash,
          title: latest.title,
          content_html: latest.content,
          link: resolvedLink,
          published_at: latest.published_at,
          status: 'unread',
          starred: false,
          archived: false
        })
      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
    }

    // Update subscription sync status
    await supabase
      .from('subscriptions')
      .update({ last_sync_at: new Date().toISOString(), sync_error: null })
      .eq('id', subscription.id)

    return NextResponse.json({ ok: true, inserted: !existing, latest_title: latest.title })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to sync latest' }, { status: 500 })
  }
}
