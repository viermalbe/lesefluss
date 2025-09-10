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
    if (!subscriptionId) return NextResponse.json({ error: 'subscriptionId required' }, { status: 400 })

    const { data: subscription, error: subErr } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .eq('user_id', user.id)
      .single()
    if (subErr || !subscription) return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })

    const parsed = await parseFeed(subscription.feed_url)
    const entries = parsed.entries || []
    let inserted = 0

    const deriveFeedId = (feedUrl?: string | null) => {
      if (!feedUrl) return null
      const m = String(feedUrl).match(/\/feeds\/([^.\/]+)(?:\.xml)?$/)
      return m ? m[1] : null
    }

    for (const item of entries) {
      const guidHash = generateGuidHash(item.guid, item.published_at)
      const { data: exists } = await supabase
        .from('entries')
        .select('id')
        .eq('guid_hash', guidHash)
        .eq('subscription_id', subscription.id)
        .single()
      if (exists) continue

      const feedId = deriveFeedId(subscription.feed_url)
      const fromLink = (item.link || '').match(/\/entries\/([A-Za-z0-9_-]+)\.html/)
      const fromGuid = String(item.guid || '').match(/([^:]+)$/)
      const entryId = fromLink ? fromLink[1] : (fromGuid ? fromGuid[1] : null)
      const derivedLink = feedId && entryId ? `https://kill-the-newsletter.com/feeds/${feedId}/entries/${entryId}.html` : null
      const link = item.link || derivedLink || null

      // Try insert with link if column exists; fallback without
      const attempt = await supabase
        .from('entries')
        .insert({
          subscription_id: subscription.id,
          guid_hash: guidHash,
          title: item.title,
          content_html: item.content,
          // @ts-ignore optional column
          link,
          published_at: item.published_at,
          status: 'unread',
          starred: false,
          archived: false
        })
      if (attempt.error) {
        const retry = await supabase
          .from('entries')
          .insert({
            subscription_id: subscription.id,
            guid_hash: guidHash,
            title: item.title,
            content_html: item.content,
            published_at: item.published_at,
            status: 'unread',
            starred: false,
            archived: false
          })
        if (retry.error) return NextResponse.json({ error: retry.error.message }, { status: 500 })
      }
      inserted++
    }

    await supabase
      .from('subscriptions')
      .update({ last_sync_at: new Date().toISOString(), sync_error: null })
      .eq('id', subscription.id)

    return NextResponse.json({ ok: true, inserted })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to sync newer' }, { status: 500 })
  }
}
