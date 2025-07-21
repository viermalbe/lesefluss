import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Star, Archive, Eye, EyeOff } from 'lucide-react'
import type { Entry } from '@/lib/types'

interface EntryCardProps {
  entry: Entry
  onToggleRead?: (id: string) => void
  onToggleStar?: (id: string) => void
  onArchive?: (id: string) => void
  onClick?: (id: string) => void
}

export function EntryCard({ 
  entry, 
  onToggleRead, 
  onToggleStar, 
  onArchive, 
  onClick 
}: EntryCardProps) {
  return (
    <Card 
      className={`cursor-pointer transition-colors hover:bg-muted/50 ${
        entry.status === 'unread' ? 'border-primary/50' : ''
      }`}
      onClick={() => onClick?.(entry.id)}
    >
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className={entry.status === 'unread' ? 'font-bold' : 'font-normal'}>
              {entry.title}
            </CardTitle>
            <CardDescription>
              {new Date(entry.published_at).toLocaleDateString()}
            </CardDescription>
          </div>
          <div className="flex gap-1 ml-4">
            {entry.status === 'unread' && (
              <Badge variant="secondary" className="text-xs">
                New
              </Badge>
            )}
            {entry.starred && (
              <Star className="h-4 w-4 text-yellow-500 fill-current" />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center">
          <div 
            className="text-sm text-muted-foreground line-clamp-2 flex-1"
            dangerouslySetInnerHTML={{ 
              __html: entry.content_html.substring(0, 150) + '...' 
            }}
          />
          <div className="flex gap-1 ml-4">
            {onToggleRead && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleRead(entry.id)
                }}
              >
                {entry.status === 'read' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            )}
            {onToggleStar && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleStar(entry.id)
                }}
              >
                <Star className={`h-4 w-4 ${entry.starred ? 'text-yellow-500 fill-current' : ''}`} />
              </Button>
            )}
            {onArchive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onArchive(entry.id)
                }}
              >
                <Archive className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
