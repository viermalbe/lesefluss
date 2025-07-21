import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { KTLNService } from '@/lib/services/ktln'
import { z } from 'zod'

const createSubscriptionSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
})

export async function POST(request: NextRequest) {
  try {
    console.log('=== API Route Debug ===')
    console.log('Request headers:', Object.fromEntries(request.headers.entries()))
    console.log('Request cookies:', request.cookies.getAll())
    
    const body = await request.json()
    console.log('Request body:', body)
    const { title } = createSubscriptionSchema.parse(body)
    
    // Create Supabase client with request context (for cookies)
    const supabase = await createClient()
    console.log('Supabase client created')
    
    // Get current user
    console.log('Getting user...')
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    console.log('User result:', { user: user?.id, error: userError })
    
    if (userError || !user) {
      console.error('Auth error:', userError)
      console.error('No user found, checking session...')
      
      // Try to get session directly
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      console.log('Session result:', { session: session?.user?.id, error: sessionError })
      
      return NextResponse.json(
        { error: 'User not authenticated', details: { userError, sessionError } },
        { status: 401 }
      )
    }
    
    console.log('Creating KTLN newsletter for user:', user.id, 'title:', title)
    
    // Create KTLN subscription (server-side to avoid CORS)
    const ktlnResult = await KTLNService.createNewsletter(title)
    
    // Insert subscription into database
    const { data, error } = await supabase
      .from('subscriptions')
      .insert({
        user_id: user.id,
        title: title,
        feed_url: ktlnResult.feed,
        ktln_email: ktlnResult.email,
        status: 'active' as const,
      })
      .select()
      .single()
    
    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: `Failed to create subscription: ${error.message}` },
        { status: 500 }
      )
    }
    
    return NextResponse.json(data)
    
  } catch (error: any) {
    console.error('Subscription creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
