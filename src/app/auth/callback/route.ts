import { NextRequest, NextResponse } from 'next/server'

// This callback is no longer needed for PIN-based authentication
// but we keep it for backward compatibility and potential OAuth flows
export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url)
  
  // Since we're using PIN-based auth, redirect to login page
  console.log('Auth callback accessed - redirecting to login (PIN-based auth)')
  return NextResponse.redirect(`${origin}/login`)
}
