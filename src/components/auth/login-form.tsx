'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase/client'
import { Mail, Loader2, KeyRound } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [pin, setPin] = useState('')
  const [step, setStep] = useState<'email' | 'pin'>('email')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  const handleSendPin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setLoading(true)
    setMessage('')

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      })

      if (error) {
        setMessage(`Error: ${error.message}`)
      } else {
        setMessage('Check your email for the 6-digit PIN!')
        setStep('pin')
      }
    } catch (error) {
      setMessage('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pin || pin.length !== 6) {
      setMessage('Please enter a 6-digit PIN')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: pin,
        type: 'email',
      })

      if (error) {
        setMessage(`Error: ${error.message}`)
      } else if (data?.user) {
        setMessage('Successfully logged in!')
        
        // Store user info in localStorage as fallback
        localStorage.setItem('lesefluss_user', JSON.stringify(data.user))
        localStorage.setItem('lesefluss_login_time', Date.now().toString())
        
        // Redirect after short delay
        setTimeout(() => {
          window.location.replace('/issues')
        }, 1000)
      } else {
        setMessage('Login failed - please try again')
      }
    } catch (error) {
      setMessage('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleBackToEmail = () => {
    setStep('email')
    setPin('')
    setMessage('')
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Welcome to Lesefluss</CardTitle>
        <CardDescription>
          {step === 'email' 
            ? 'Enter your email to receive a 6-digit PIN'
            : 'Enter the 6-digit PIN from your email'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === 'email' ? (
          <form onSubmit={handleSendPin} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Mail className="mr-2 h-4 w-4" />
              )}
              Send PIN
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyPin} className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground mb-2">
                PIN sent to: <strong>{email}</strong>
              </div>
              <Input
                type="text"
                placeholder="Enter 6-digit PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                disabled={loading}
                maxLength={6}
                className="text-center text-lg tracking-widest"
                required
              />
            </div>
            <div className="space-y-2">
              <Button type="submit" className="w-full" disabled={loading || pin.length !== 6}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound className="mr-2 h-4 w-4" />
                )}
                Verify PIN
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                className="w-full" 
                onClick={handleBackToEmail}
                disabled={loading}
              >
                Back to Email
              </Button>
            </div>
          </form>
        )}

        {message && (
          <div className={`text-sm text-center ${
            message.includes('Error') ? 'text-destructive' : 'text-green-600'
          }`}>
            {message}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
