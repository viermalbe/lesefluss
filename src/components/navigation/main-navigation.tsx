'use client'

import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useNavigationGestures } from '@/lib/hooks/use-navigation-gestures'

// Navigation routes in order
const MAIN_ROUTES = [
  '/issues',
  '/archive',
  '/sources'
]

/**
 * MainNavigation component
 * Handles swipe gestures and keyboard navigation between main routes
 */
export function MainNavigation({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Get current route index
  const getCurrentRouteIndex = (): number => {
    // Strip trailing slashes and query params for comparison
    const normalizedPath = pathname?.split('?')[0].replace(/\/$/, '') || ''
    
    // Check if we're on a detail page
    if (normalizedPath.includes('/issues/') || normalizedPath.includes('/archive/')) {
      // We're on a detail page, so we should return the parent route
      if (normalizedPath.includes('/issues/')) return MAIN_ROUTES.indexOf('/issues')
      if (normalizedPath.includes('/archive/')) return MAIN_ROUTES.indexOf('/archive')
    }
    
    // Check main routes
    const index = MAIN_ROUTES.indexOf(normalizedPath)
    return index >= 0 ? index : 0 // Default to first route if not found
  }
  
  // Navigate to next main route
  const navigateToNextRoute = () => {
    const currentIndex = getCurrentRouteIndex()
    const nextIndex = (currentIndex + 1) % MAIN_ROUTES.length
    router.push(MAIN_ROUTES[nextIndex])
  }
  
  // Navigate to previous main route
  const navigateToPreviousRoute = () => {
    const currentIndex = getCurrentRouteIndex()
    const prevIndex = (currentIndex - 1 + MAIN_ROUTES.length) % MAIN_ROUTES.length
    router.push(MAIN_ROUTES[prevIndex])
  }
  
  // Only enable main navigation gestures on main routes, not on detail pages
  const isMainRoute = (): boolean => {
    if (!pathname) return false
    
    // Check if we're on a detail page
    if (pathname.includes('/issues/') || pathname.includes('/archive/')) {
      return false
    }
    
    return true
  }
  
  // Setup navigation gestures
  useNavigationGestures({
    onNext: navigateToNextRoute,
    onPrevious: navigateToPreviousRoute,
    containerRef,
    enabled: isMainRoute()
  })
  
  return (
    <div ref={containerRef} className="flex flex-col min-h-screen">
      {children}
    </div>
  )
}
