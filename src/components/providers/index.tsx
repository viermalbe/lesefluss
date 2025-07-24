'use client'

import { ReactNode } from 'react'
import { ThemeProvider } from './theme-provider'
import { TRPCProvider } from './trpc-provider'
import { AuthProvider } from './auth-provider'
import { SWRConfig } from 'swr'

interface ProvidersProps {
  children: ReactNode
}

/**
 * Globale Provider-Komponente
 * 
 * Enthält alle Provider für die Anwendung, einschließlich:
 * - ThemeProvider: Für das Theming
 * - SWRConfig: Deaktiviert die automatische Revalidierung beim Fokuswechsel
 * - TRPCProvider: Für die API-Kommunikation
 * - AuthProvider: Für die Authentifizierung
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {/* 
        SWRConfig: Deaktiviert die automatische Revalidierung beim Fokuswechsel,
        was verhindert, dass die Seite neu geladen wird, wenn der Tab den Fokus zurückerhält
      */}
      <SWRConfig 
        value={{
          revalidateOnFocus: false,  // Deaktiviert Revalidierung beim Fokuswechsel
          revalidateIfStale: true,   // Revalidiert weiterhin veraltete Daten
          revalidateOnReconnect: true // Revalidiert bei Wiederverbindung
        }}
      >
        <TRPCProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </TRPCProvider>
      </SWRConfig>
    </ThemeProvider>
  )
}
