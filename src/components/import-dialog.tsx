import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface ImportDialogProps {
  onImport?: (title: string) => void
  isOpen?: boolean
  onClose?: () => void
}

export function ImportDialog({ onImport, isOpen = true, onClose }: ImportDialogProps) {
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setLoading(true)
    try {
      await onImport?.(title.trim())
      setTitle('')
      onClose?.()
    } catch (error) {
      console.error('Import failed:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Import Newsletter</CardTitle>
          <CardDescription>
            Enter a name for your newsletter subscription. We'll create a unique email address for you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              placeholder="Newsletter name (e.g., 'Tech Weekly')"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || !title.trim()}
              >
                {loading ? 'Creating...' : 'Create Subscription'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
