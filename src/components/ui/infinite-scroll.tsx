'use client'

import { useEffect, useRef, useState } from 'react'

interface InfiniteScrollProps {
  /**
   * Function to call when more data should be loaded
   * Should return a boolean indicating if there is more data to load
   */
  onLoadMore: () => Promise<boolean>
  
  /**
   * Whether the component is currently loading data
   */
  isLoading?: boolean
  
  /**
   * Whether there is more data to load
   */
  hasMore?: boolean
  
  /**
   * Distance from the bottom of the page to trigger loading more data (in pixels)
   * Default: 300px
   */
  threshold?: number
  
  /**
   * Component to show when loading more data
   */
  loadingComponent?: React.ReactNode
  
  /**
   * Component to show when there is no more data to load
   */
  endComponent?: React.ReactNode
  
  /**
   * Children to render
   */
  children: React.ReactNode
}

/**
 * InfiniteScroll component that automatically loads more data when the user scrolls to the bottom of the page
 */
export function InfiniteScroll({
  onLoadMore,
  isLoading = false,
  hasMore = true,
  threshold = 300,
  loadingComponent = <DefaultLoadingComponent />,
  endComponent = <DefaultEndComponent />,
  children
}: InfiniteScrollProps) {
  const [initialLoad, setInitialLoad] = useState(true)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null)
  
  // Set up the intersection observer to detect when the user scrolls to the bottom
  useEffect(() => {
    // Only set up the observer on the client
    if (typeof window === 'undefined') return
    
    // Clean up any existing observer
    if (observerRef.current) {
      observerRef.current.disconnect()
    }
    
    // Don't set up the observer if we're already loading or there's no more data
    if (isLoading || !hasMore) return
    
    const observer = new IntersectionObserver(
      async (entries) => {
        // If the trigger element is visible and we're not loading and there's more data
        if (entries[0].isIntersecting && !isLoading && hasMore) {
          try {
            await onLoadMore()
          } catch (error) {
            console.error('Error loading more data:', error)
          }
        }
      },
      {
        rootMargin: `0px 0px ${threshold}px 0px`,
        threshold: 0.1
      }
    )
    
    if (loadMoreTriggerRef.current) {
      observer.observe(loadMoreTriggerRef.current)
    }
    
    observerRef.current = observer
    
    return () => {
      observer.disconnect()
    }
  }, [onLoadMore, isLoading, hasMore, threshold])
  
  // Handle initial load
  useEffect(() => {
    if (initialLoad && !isLoading) {
      setInitialLoad(false)
    }
  }, [initialLoad, isLoading])
  
  return (
    <>
      {children}
      
      <div ref={loadMoreTriggerRef} className="h-10 w-full">
        {isLoading && loadingComponent}
        {!isLoading && !hasMore && endComponent}
      </div>
    </>
  )
}

function DefaultLoadingComponent() {
  return (
    <div className="flex items-center justify-center py-4">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
    </div>
  )
}

function DefaultEndComponent() {
  return (
    <div className="flex items-center justify-center py-4 text-muted-foreground text-sm">
      No more items to load
    </div>
  )
}
