'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useOnboarding } from '@/lib/hooks/useOnboarding'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { CheckCircle, HelpCircle, Mail } from 'lucide-react'

const addSourceSchema = z.object({
  title: z.string().min(1, 'Titel ist erforderlich').max(100, 'Titel zu lang'),
})

type AddSourceForm = z.infer<typeof addSourceSchema>

interface GuidedAddSourceProps {
  onSuccess: () => void
  onSkip: () => void
}

/**
 * Guided version of Add Source dialog for onboarding
 * Includes helpful explanations and step-by-step guidance
 */
export function GuidedAddSource({ onSuccess, onSkip }: GuidedAddSourceProps) {
  const [currentStep, setCurrentStep] = useState<'form' | 'success'>('form')
  const [generatedEmail, setGeneratedEmail] = useState<string>('')

  const form = useForm<AddSourceForm>({
    resolver: zodResolver(addSourceSchema),
    defaultValues: {
      title: '',
    },
  })

  const [isCreating, setIsCreating] = useState(false)
  
  // Get onboarding hook for direct refresh
  const { refreshSubscriptions } = useOnboarding()

  const createSubscription = async (data: AddSourceForm) => {
    setIsCreating(true)
    
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        throw new Error('User not authenticated')
      }
      
      // Create mock KTLN subscription for testing
      console.log('Creating mock newsletter for:', data.title)
      const mockId = Math.random().toString(36).substring(2, 15)
      const ktlnResult = {
        email: `${mockId}@kill-the-newsletter.com`,
        feed: `https://kill-the-newsletter.com/feeds/${mockId}.xml`
      }
      
      // Insert subscription into database (no ktln_email required)
      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          title: data.title,
          feed_url: ktlnResult.feed,
          status: 'active' as const,
        })
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to create subscription: ${error.message}`)
      }
      
      // Show the generated email from the mock result on success
      setGeneratedEmail(ktlnResult.email)
      setCurrentStep('success')
      toast.success('Newsletter-Quelle erfolgreich hinzugefügt!')
      
      // Refresh subscriptions to update onboarding state
      await refreshSubscriptions()
      
      // Call onSuccess callback
      if (onSuccess) {
        onSuccess()
      }
      
    } catch (error: any) {
      console.error('Subscription creation error:', error)
      toast.error(`Fehler: ${error.message}`)
    } finally {
      setIsCreating(false)
    }
  }

  const onSubmit = (data: AddSourceForm) => {
    createSubscription(data)
  }

  if (currentStep === 'success') {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
          <CardTitle>Perfekt! Deine erste Newsletter-Quelle ist bereit</CardTitle>
          <CardDescription>
            Du hast erfolgreich deinen ersten Newsletter hinzugefügt
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="w-4 h-4" />
              <span className="font-medium">Deine einzigartige E-Mail-Adresse:</span>
            </div>
            <code className="text-sm bg-background px-2 py-1 rounded border">
              {generatedEmail}
            </code>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium">Nächste Schritte:</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Gehe zur Website des Newsletters, den du abonnieren möchtest</li>
              <li>Verwende die obige E-Mail-Adresse zum Anmelden</li>
              <li>Neue Newsletter-Ausgaben erscheinen automatisch in deinem Feed</li>
            </ol>
          </div>

          <div className="flex gap-3 pt-4">
            <Button onClick={onSuccess} className="flex-1">
              Zu meinen Newslettern
            </Button>
            <Button variant="outline" onClick={() => setCurrentStep('form')}>
              Weiteren hinzufügen
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5" />
          Deinen ersten Newsletter hinzufügen
        </CardTitle>
        <CardDescription>
          Gib einfach einen Namen für deinen Newsletter ein. Wir erstellen automatisch eine einzigartige E-Mail-Adresse für dich.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Newsletter-Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="z.B. TechCrunch, Morning Brew, Der Spiegel..."
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Wähle einen Namen, der dir hilft, den Newsletter später zu erkennen
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
              <h4 className="font-medium mb-2 text-blue-900 dark:text-blue-100">
                💡 Wie funktioniert das?
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Wir verwenden Kill-The-Newsletter.com, um für jeden Newsletter eine einzigartige 
                E-Mail-Adresse zu erstellen. Diese wandelt E-Mails automatisch in RSS-Feeds um, 
                die du hier lesen kannst.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={isCreating}
                className="flex-1"
              >
                {isCreating ? 'Wird hinzugefügt...' : 'Newsletter hinzufügen'}
              </Button>
              <Button type="button" variant="outline" onClick={onSkip}>
                Später
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
