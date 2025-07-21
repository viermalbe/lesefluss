'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Loader2, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'

const addSourceSchema = z.object({
  title: z.string().min(1, 'Please enter a title for this source').max(255, 'Title is too long'),
})

type AddSourceFormData = z.infer<typeof addSourceSchema>

interface AddSourceDialogProps {
  children?: React.ReactNode
  onSuccess?: () => void
}

export function AddSourceDialog({ children, onSuccess }: AddSourceDialogProps) {
  const [open, setOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const router = useRouter()
  
  const form = useForm<AddSourceFormData>({
    resolver: zodResolver(addSourceSchema),
    defaultValues: {
      title: '',
    },
  })

  const createSubscription = async (data: AddSourceFormData) => {
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
      
      // Insert subscription into database
      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          title: data.title,
          feed_url: ktlnResult.feed,
          ktln_email: ktlnResult.email,
          status: 'active' as const,
        })
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to create subscription: ${error.message}`)
      }
      
      toast.success(`${subscription.title} has been added to your sources.`)
      form.reset()
      setOpen(false)
      onSuccess?.()
      
    } catch (error: any) {
      console.error('Subscription creation error:', error)
      toast.error(`Failed to add source: ${error.message}`)
    } finally {
      setIsCreating(false)
    }
  }

  const onSubmit = (data: AddSourceFormData) => {
    createSubscription(data)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Source
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Source</DialogTitle>
          <DialogDescription>
            Add a newsletter to your reading list. We'll create a unique email address 
            that converts newsletters into RSS feeds automatically using Kill-The-Newsletter.com.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source Title</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g. TechCrunch Newsletter" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Give this newsletter a memorable title (e.g., "TechCrunch Newsletter")
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                variant="default"
                disabled={isCreating}
              >
                {isCreating && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Add Source
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
