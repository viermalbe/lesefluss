'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Archive Page Redirect
 * Redirects users from the old /archive route to the new /issues route with archive filter
 */
export default function ArchivePage() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to issues page with archive filter
    router.replace('/issues?filter=archive')
  }, [router])
  
  // Return null as this component will redirect immediately
  return null
}
