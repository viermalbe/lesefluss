'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useOnboarding } from '@/lib/hooks/useOnboarding'

interface OnboardingWrapperProps {
  children: React.ReactNode
}

/**
 * Wrapper component that handles onboarding routing logic
 * Redirects to onboarding if user needs it, unless already on onboarding page
 */
export function OnboardingWrapper({ children }: OnboardingWrapperProps) {
  const { needsOnboarding, isLoading } = useOnboarding()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isLoading && needsOnboarding && pathname !== '/onboarding') {
      router.push('/onboarding')
    }
  }, [needsOnboarding, isLoading, pathname, router])

  // Show loading state while checking onboarding status
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // If user needs onboarding and is not on onboarding page, show loading
  if (needsOnboarding && pathname !== '/onboarding') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return <>{children}</>
}
