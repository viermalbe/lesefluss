// Feeds overview page

export default function FeedsPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Your Subscriptions</h1>
          <p className="text-muted-foreground">
            Manage your newsletter subscriptions
          </p>
        </div>
        
        {/* TODO: Implement actual feeds list */}
        <div className="bg-card p-6 rounded-lg border">
          <p className="text-center text-muted-foreground">
            Subscription list will be implemented in task 5.1
          </p>
        </div>
      </div>
    </div>
  )
}
