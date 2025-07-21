import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export function TestUI() {
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold">shadcn/ui Test</h1>
      
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Test Card</CardTitle>
          <CardDescription>
            Testing shadcn/ui components integration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Test input field" />
          <div className="flex gap-2">
            <Button>Primary Button</Button>
            <Button variant="outline">Outline Button</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
