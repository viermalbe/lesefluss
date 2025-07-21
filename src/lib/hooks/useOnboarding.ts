import { useEffect, useState } from 'react'
import { api } from '@/lib/trpc/client'
import { supabase } from '@/lib/supabase/client'

/**
 * Hook to manage user onboarding state
 * Determines if user needs onboarding based on subscription count
 */
export function useOnboarding() {
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [subscriptionCount, setSubscriptionCount] = useState(0)

  const { data: subscriptions, isLoading: subscriptionsLoading } = api.subscription.getAll.useQuery()

  // Also check Supabase directly for more reliable results
  const checkSubscriptionsDirectly = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { data, error } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', user.id)
      
      if (!error && data) {
        setSubscriptionCount(data.length)
        setNeedsOnboarding(data.length === 0)
      }
    } catch (error) {
      console.error('Error checking subscriptions:', error)
    }
  }

  useEffect(() => {
    if (!subscriptionsLoading) {
      const hasSubscriptions = subscriptions && subscriptions.length > 0
      setNeedsOnboarding(!hasSubscriptions)
      setSubscriptionCount(subscriptions?.length ?? 0)
      setIsLoading(false)
      
      // Also check directly from Supabase as fallback
      if (!hasSubscriptions) {
        checkSubscriptionsDirectly()
      }
    }
  }, [subscriptions, subscriptionsLoading])

  const completeOnboarding = async () => {
    setNeedsOnboarding(false)
    // Also refresh from Supabase to ensure we have latest data
    await checkSubscriptionsDirectly()
  }

  return {
    needsOnboarding,
    isLoading,
    completeOnboarding,
    subscriptionCount,
    refreshSubscriptions: checkSubscriptionsDirectly
  }
}
