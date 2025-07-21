'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { WelcomeScreen } from '@/components/onboarding/welcome-screen'
import { GuidedAddSource } from '@/components/onboarding/guided-add-source'
import { useOnboarding } from '@/lib/hooks/useOnboarding'

/**
 * Onboarding page for new users
 * Guides through welcome screen and first newsletter setup
 */
export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState<'welcome' | 'add-source'>('welcome')
  const router = useRouter()
  const { completeOnboarding } = useOnboarding()

  const handleGetStarted = () => {
    setCurrentStep('add-source')
  }

  const handleSuccess = () => {
    completeOnboarding()
    router.push('/sources')
  }

  const handleSkip = () => {
    completeOnboarding()
    router.push('/sources')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        {currentStep === 'welcome' && (
          <WelcomeScreen onGetStarted={handleGetStarted} />
        )}
        
        {currentStep === 'add-source' && (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">Lass uns loslegen!</h1>
              <p className="text-muted-foreground">
                Füge deinen ersten Newsletter hinzu und starte deine Lesefluss-Reise
              </p>
            </div>
            <GuidedAddSource onSuccess={handleSuccess} onSkip={handleSkip} />
          </div>
        )}
      </div>
    </div>
  )
}
