"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import { parseFeed, generateGuidHash } from '@/lib/services/feed-parser'
import { useAuth } from '@/lib/hooks'

interface AddFeedDialogProps {
  onSuccess?: () => void
  children: React.ReactNode
}

export function AddFeedDialog({ onSuccess, children }: AddFeedDialogProps) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [feedUrl, setFeedUrl] = useState('')
  const [title, setTitle] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [validated, setValidated] = useState(false)
  const [detectedImage, setDetectedImage] = useState<string | undefined>(undefined)

  const handleValidate = async () => {
    if (!feedUrl.trim()) {
      toast.error('Please enter a feed URL')
      return
    }
    try {
      setLoading(true)
      const res = await fetch('/api/validate-feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedUrl })
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Feed validation failed')
      }
      if (!title && data.title) setTitle(data.title)
      if (!imageUrl && data.imageUrl) {
        setImageUrl(data.imageUrl)
        setDetectedImage(data.imageUrl)
      } else if (data.imageUrl) {
        setDetectedImage(data.imageUrl)
      } else {
        setDetectedImage(undefined)
      }
      setValidated(true)
      toast.success('Feed validated')
    } catch (e: any) {
      toast.error(e.message || 'Could not validate feed')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Not authenticated')
      return
    }
    if (!feedUrl.trim()) {
      toast.error('Feed URL is required')
      return
    }

    try {
      setLoading(true)
      // Validate once to autofill title if missing
      if (!title) {
        try {
          const res = await fetch('/api/validate-feed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ feedUrl })
          })
          const data = await res.json()
          if (res.ok && data.title && !title) setTitle(data.title)
        } catch {}
      }

      const { data: created, error } = await supabase.from('subscriptions').insert({
        user_id: user.id,
        title: title || feedUrl,
        feed_url: feedUrl,
        status: 'active',
        image_url: imageUrl || null
      } as any).select().single()
      if (error) throw new Error(error.message)

      // Immediately sync latest entry for this new subscription (client-side)
      try {
        const parsed = await parseFeed(feedUrl)
        const entries = parsed.entries || []
        if (entries.length > 0) {
          const latest = entries.reduce((acc: any, e: any) => {
            if (!acc) return e
            const da = new Date(acc.published_at || acc.updated || acc.date).getTime()
            const db = new Date(e.published_at || e.updated || e.date).getTime()
            return db > da ? e : acc
          }, null as any)

          if (latest) {
            const guidHash = generateGuidHash(latest.guid, latest.published_at)
            const { data: exists } = await supabase
              .from('entries')
              .select('id')
              .eq('guid_hash', guidHash)
              .eq('subscription_id', created?.id)
              .single()
            if (!exists) {
              // Try to keep link if provided
              const resolveLink = () => {
                if (latest.link) return latest.link
                // KTLN fallback (rare for new generic feeds)
                const feedIdMatch = String(feedUrl).match(/\/feeds\/([^.\/]+)(?:\.xml)?$/)
                const feedId = feedIdMatch ? feedIdMatch[1] : null
                const entryIdMatch = String(latest.guid || '').match(/([^:]+)$/)
                const entryId = entryIdMatch ? entryIdMatch[1] : null
                return feedId && entryId ? `https://kill-the-newsletter.com/feeds/${feedId}/entries/${entryId}.html` : null
              }
              const link = resolveLink()
              let insertedOk = false
              // First, try with link (for DBs that have the column)
              const attemptWithLink = await supabase
                .from('entries')
                .insert({
                  subscription_id: created?.id,
                  guid_hash: guidHash,
                  title: latest.title,
                  content_html: latest.content,
                  // @ts-ignore — may not exist in DB; we'll retry without it on error
                  link,
                  published_at: latest.published_at,
                  status: 'unread',
                  starred: false,
                  archived: false
                })
              if (attemptWithLink.error) {
                // Retry without link for schemas that do not yet have the column
                const retry = await supabase
                  .from('entries')
                  .insert({
                    subscription_id: created?.id,
                    guid_hash: guidHash,
                    title: latest.title,
                    content_html: latest.content,
                    published_at: latest.published_at,
                    status: 'unread',
                    starred: false,
                    archived: false
                  })
                if (retry.error) throw new Error(retry.error.message)
                insertedOk = true
              } else {
                insertedOk = true
              }
              if (insertedOk) toast.success('Initial sync complete: 1 new entry synced')
            } else {
              toast.success('Initial sync complete: Already up to date')
            }
          }
        }
      } catch (e: any) {
        toast.warning(`Initial sync failed: ${e?.message || 'unknown error'}`)
      }

      toast.success('Feed added')
      setOpen(false)
      setFeedUrl('')
      setTitle('')
      setImageUrl('')
      setDetectedImage(undefined)
      setValidated(false)
      if (onSuccess) onSuccess()
    } catch (e: any) {
      toast.error(e.message || 'Failed to add feed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Feed</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="feedUrl">Feed URL</Label>
            <Input id="feedUrl" placeholder="https://example.com/feed" value={feedUrl} onChange={e => setFeedUrl(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Title (optional)</Label>
            <Input id="title" placeholder="Auto-filled from feed" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="image">Image URL (optional)</Label>
            <Input id="image" placeholder="https://example.com/logo.png" value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
            {validated && (imageUrl || detectedImage) && (
              <div className="mt-2 border rounded p-2">
                <div className="text-xs text-muted-foreground mb-2">Preview</div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl || detectedImage} alt="Feed logo preview" className="h-16 w-16 object-contain bg-white rounded" />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Close</Button>
            {!validated ? (
              <Button onClick={handleValidate} disabled={loading || !feedUrl}>{loading ? 'Validating…' : 'Validate'}</Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleValidate} disabled={loading || !feedUrl}>Re-validate</Button>
                <Button onClick={handleSubmit} disabled={loading || !feedUrl}>Add Feed</Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
