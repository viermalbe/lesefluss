'use client'

import { ReactNode } from 'react'
import { ThemeProvider } from './theme-provider'
import { TRPCProvider } from './trpc-provider'
import { AuthProvider } from './auth-provider'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <TRPCProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </TRPCProvider>
    </ThemeProvider>
  )
}
