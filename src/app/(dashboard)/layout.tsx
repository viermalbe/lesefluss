import { MainLayout } from '@/components/layout/main-layout'
import { OnboardingWrapper } from '@/components/onboarding/onboarding-wrapper'
import { MainNavigation } from '@/components/navigation/main-navigation'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <MainLayout>
      {/* Wrap content with MainNavigation for swipe and keyboard navigation */}
      <MainNavigation>
        {/* Temporarily disabled OnboardingWrapper due to tRPC auth issues */}
        {/* <OnboardingWrapper> */}
          {children}
        {/* </OnboardingWrapper> */}
      </MainNavigation>
    </MainLayout>
  )
}
