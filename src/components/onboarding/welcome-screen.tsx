'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Mail, Rss, Smartphone } from 'lucide-react'

interface WelcomeScreenProps {
  onGetStarted: () => void
}

/**
 * Welcome screen component for first-time users
 * Explains app functionality and guides to first newsletter setup
 */
export function WelcomeScreen({ onGetStarted }: WelcomeScreenProps) {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">Willkommen bei Lesefluss</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Dein persönlicher Newsletter-Reader. Sammle, organisiere und lese deine Newsletter an einem Ort.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <Card>
          <CardHeader className="text-center">
            <Mail className="w-12 h-12 mx-auto mb-4 text-primary" />
            <CardTitle>Newsletter sammeln</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-center">
              Füge deine Newsletter hinzu und erhalte eine einzigartige E-Mail-Adresse für jede Quelle.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="text-center">
            <Rss className="w-12 h-12 mx-auto mb-4 text-primary" />
            <CardTitle>Automatisch synchronisieren</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-center">
              Neue Newsletter-Ausgaben werden automatisch in deinen Feed eingespeist.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="text-center">
            <Smartphone className="w-12 h-12 mx-auto mb-4 text-primary" />
            <CardTitle>Überall lesen</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-center">
              Lese deine Newsletter auf jedem Gerät - online und offline verfügbar.
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      <div className="text-center">
        <Button onClick={onGetStarted} size="lg" className="px-8">
          Ersten Newsletter hinzufügen
        </Button>
        <p className="text-sm text-muted-foreground mt-4">
          Du kannst jederzeit weitere Newsletter hinzufügen
        </p>
      </div>
    </div>
  )
}
