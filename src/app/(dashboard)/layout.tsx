import { MainLayout } from '@/components/layout/main-layout'
import { OnboardingWrapper } from '@/components/onboarding/onboarding-wrapper'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <MainLayout>
      {/* Temporarily disabled OnboardingWrapper due to tRPC auth issues */}
      {/* <OnboardingWrapper> */}
        {children}
      {/* </OnboardingWrapper> */}
    </MainLayout>
  )
}
