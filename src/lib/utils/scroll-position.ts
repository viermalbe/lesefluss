/**
 * Scroll Position Persistence Utility
 * 
 * Saves and restores scroll positions across page refreshes and navigation.
 * Uses sessionStorage to persist scroll position per entry/page.
 */

interface ScrollPosition {
  x: number
  y: number
  timestamp: number
}

const SCROLL_STORAGE_PREFIX = 'lesefluss_scroll_'
const SCROLL_RESTORE_DELAY = 100 // ms to wait before restoring scroll
const SCROLL_SAVE_THROTTLE = 1000 // ms to throttle scroll save events (increased to reduce frequency)

class ScrollPositionManager {
  private throttleTimers: Map<string, NodeJS.Timeout> = new Map()
  private isRestoring = false

  /**
   * Generate a unique key for the current page/entry
   */
  private getStorageKey(identifier: string): string {
    return `${SCROLL_STORAGE_PREFIX}${identifier}`
  }

  /**
   * Save current scroll position for a specific identifier
   */
  saveScrollPosition(identifier: string): void {
    if (this.isRestoring) return // Don't save while restoring

    const key = this.getStorageKey(identifier)
    
    // Throttle scroll saves to avoid excessive storage writes
    const existingTimer = this.throttleTimers.get(key)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    const timer = setTimeout(() => {
      try {
        const position: ScrollPosition = {
          x: window.scrollX || window.pageXOffset,
          y: window.scrollY || window.pageYOffset,
          timestamp: Date.now()
        }

        sessionStorage.setItem(key, JSON.stringify(position))
        // Debug logs removed to reduce console noise
      } catch (error) {
        console.warn('Failed to save scroll position:', error)
      }
      
      this.throttleTimers.delete(key)
    }, SCROLL_SAVE_THROTTLE)

    this.throttleTimers.set(key, timer)
  }

  /**
   * Restore scroll position for a specific identifier
   */
  restoreScrollPosition(identifier: string): boolean {
    try {
      const key = this.getStorageKey(identifier)
      const savedData = sessionStorage.getItem(key)
      
      if (!savedData) {
        // Debug logs removed to reduce console noise
        return false
      }

      const position: ScrollPosition = JSON.parse(savedData)
      
      // Check if the saved position is not too old (max 1 hour)
      const maxAge = 60 * 60 * 1000 // 1 hour in ms
      if (Date.now() - position.timestamp > maxAge) {
        // Debug logs removed to reduce console noise
        this.clearScrollPosition(identifier)
        return false
      }

      // Only restore if scrolled significantly (> 100px)
      if (position.y <= 100) {
        return false
      }

      this.isRestoring = true

      // Simplified: single attempt to restore scroll position
      setTimeout(() => {
        try {
          window.scrollTo({
            left: position.x,
            top: position.y,
            behavior: 'auto' // Use 'auto' for instant positioning
          })
          
          // Debug logs removed to reduce console noise
          
          // Clear the restoring flag immediately
          this.isRestoring = false
        } catch (error) {
          console.warn('Failed to restore scroll position:', error)
          this.isRestoring = false
        }
      }, SCROLL_RESTORE_DELAY)

      return true
    } catch (error) {
      console.warn('Failed to restore scroll position:', error)
      this.isRestoring = false
      return false
    }
  }

  /**
   * Clear saved scroll position for a specific identifier
   */
  clearScrollPosition(identifier: string): void {
    try {
      const key = this.getStorageKey(identifier)
      sessionStorage.removeItem(key)
      // Debug logs removed to reduce console noise
    } catch (error) {
      console.warn('Failed to clear scroll position:', error)
    }
  }

  /**
   * Set up automatic scroll position saving for page visibility changes
   * 
   * HINWEIS: visibilitychange-Event wurde entfernt, um unerwünschte Neuladeeffekte zu vermeiden
   */
  setupAutoSave(identifier: string): () => void {
    // Nur noch auf explizite Benutzeraktionen reagieren
    const handleBeforeUnload = () => {
      this.saveScrollPosition(identifier)
    }

    const handleScroll = () => {
      this.saveScrollPosition(identifier)
    }

    // Add event listeners - visibilitychange entfernt!
    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('scroll', handleScroll, { passive: true })

    // Return cleanup function
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('scroll', handleScroll)
      
      // Clear any pending throttle timers
      const key = this.getStorageKey(identifier)
      const timer = this.throttleTimers.get(key)
      if (timer) {
        clearTimeout(timer)
        this.throttleTimers.delete(key)
      }
    }
  }

  /**
   * Clean up old scroll positions (older than 24 hours)
   */
  cleanupOldPositions(): void {
    try {
      const maxAge = 24 * 60 * 60 * 1000 // 24 hours in ms
      const now = Date.now()
      
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key && key.startsWith(SCROLL_STORAGE_PREFIX)) {
          try {
            const data = sessionStorage.getItem(key)
            if (data) {
              const position: ScrollPosition = JSON.parse(data)
              if (now - position.timestamp > maxAge) {
                sessionStorage.removeItem(key)
                // Debug logs removed to reduce console noise
              }
            }
          } catch (error) {
            // Invalid data, remove it
            sessionStorage.removeItem(key)
          }
        }
      }
    } catch (error) {
      console.warn('Failed to cleanup old scroll positions:', error)
    }
  }
}

// Export singleton instance
export const scrollPositionManager = new ScrollPositionManager()

// Initialize cleanup on first use
if (typeof window !== 'undefined') {
  // Clean up old positions on page load
  scrollPositionManager.cleanupOldPositions()
  
  // Set up periodic cleanup (every 30 minutes)
  setInterval(() => {
    scrollPositionManager.cleanupOldPositions()
  }, 30 * 60 * 1000)
}

/**
 * React hook for scroll position management
 */
export function useScrollPosition(identifier: string) {
  const savePosition = () => scrollPositionManager.saveScrollPosition(identifier)
  const restorePosition = () => scrollPositionManager.restoreScrollPosition(identifier)
  const clearPosition = () => scrollPositionManager.clearScrollPosition(identifier)
  
  return {
    savePosition,
    restorePosition,
    clearPosition,
    setupAutoSave: () => scrollPositionManager.setupAutoSave(identifier)
  }
}
