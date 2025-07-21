import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      let user = session?.user ?? null
      
      // Fallback to localStorage if no session but user was stored
      if (!user && typeof window !== 'undefined') {
        const storedUser = localStorage.getItem('lesefluss_user')
        const loginTime = localStorage.getItem('lesefluss_login_time')
        
        if (storedUser && loginTime) {
          const timeDiff = Date.now() - parseInt(loginTime)
          // Consider localStorage valid for 24 hours
          if (timeDiff < 24 * 60 * 60 * 1000) {
            user = JSON.parse(storedUser)
          } else {
            localStorage.removeItem('lesefluss_user')
            localStorage.removeItem('lesefluss_login_time')
          }
        }
      }
      
      if (error) {
        setError(error.message)
      } else {
        setUser(user)
      }
      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'INITIAL_SESSION' && session) {
          setUser(session.user)
        } else if (event === 'SIGNED_IN' && session) {
          setUser(session.user)
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
        } else {
          setUser(session?.user ?? null)
        }
        
        setLoading(false)
        setError(null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string) => {
    setLoading(true)
    setError(null)
    
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    
    if (error) {
      setError(error.message)
    }
    
    setLoading(false)
  }

  const signOut = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      setError(error.message)
    }
    
    setLoading(false)
  }

  return {
    user,
    loading,
    error,
    signIn,
    signOut,
    isAuthenticated: !!user,
  }
}
