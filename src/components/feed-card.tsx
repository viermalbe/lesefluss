import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Subscription } from '@/lib/types'

interface FeedCardProps {
  subscription: Subscription
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}

export function FeedCard({ subscription, onEdit, onDelete }: FeedCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{subscription.title}</CardTitle>
        <CardDescription>
          Created {new Date(subscription.created_at).toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            {subscription.ktln_email}
          </p>
          <div className="flex gap-2">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(subscription.id)}
              >
                Edit
              </Button>
            )}
            {onDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDelete(subscription.id)}
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
