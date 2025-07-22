'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface SyncStatus {
  isLoading: boolean
  lastSync: Date | null
  canSync: boolean
  nextSyncAvailable: Date | null
}

const SYNC_COOLDOWN_MINUTES = 15 // Minimum 15 minutes between manual syncs
const STORAGE_KEY = 'lesefluss-last-sync'

export function useSmartSync() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isLoading: false,
    lastSync: null,
    canSync: true,
    nextSyncAvailable: null
  })

  // Load last sync time from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const lastSyncStr = localStorage.getItem(STORAGE_KEY)
      if (lastSyncStr) {
        const lastSync = new Date(lastSyncStr)
        const now = new Date()
        const timeDiff = now.getTime() - lastSync.getTime()
        const minutesDiff = timeDiff / (1000 * 60)
        
        if (minutesDiff < SYNC_COOLDOWN_MINUTES) {
          const nextSync = new Date(lastSync.getTime() + (SYNC_COOLDOWN_MINUTES * 60 * 1000))
          setSyncStatus({
            isLoading: false,
            lastSync,
            canSync: false,
            nextSyncAvailable: nextSync
          })
        } else {
          setSyncStatus(prev => ({
            ...prev,
            lastSync,
            canSync: true,
            nextSyncAvailable: null
          }))
        }
      }
    }
  }, [])

  // Update sync availability every minute
  useEffect(() => {
    const interval = setInterval(() => {
      if (syncStatus.nextSyncAvailable) {
        const now = new Date()
        if (now >= syncStatus.nextSyncAvailable) {
          setSyncStatus(prev => ({
            ...prev,
            canSync: true,
            nextSyncAvailable: null
          }))
        }
      }
    }, 60000) // Check every minute

    return () => clearInterval(interval)
  }, [syncStatus.nextSyncAvailable])

  const triggerSync = useCallback(async (force = false) => {
    if (!syncStatus.canSync && !force) {
      const timeLeft = syncStatus.nextSyncAvailable 
        ? Math.ceil((syncStatus.nextSyncAvailable.getTime() - new Date().getTime()) / (1000 * 60))
        : 0
      toast.info(`Please wait ${timeLeft} more minutes before syncing again`)
      return false
    }

    setSyncStatus(prev => ({ ...prev, isLoading: true }))

    try {
      const response = await fetch('/api/sync-feeds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          source: 'manual',
          force: force 
        })
      })

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.statusText}`)
      }

      const result = await response.json()
      const now = new Date()
      const nextSync = new Date(now.getTime() + (SYNC_COOLDOWN_MINUTES * 60 * 1000))

      // Update localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, now.toISOString())
      }

      setSyncStatus({
        isLoading: false,
        lastSync: now,
        canSync: false,
        nextSyncAvailable: nextSync
      })

      toast.success(`Sync completed! ${result.entries_added || 0} new articles found`)
      return true

    } catch (error: any) {
      console.error('Sync error:', error)
      toast.error(`Sync failed: ${error.message}`)
      setSyncStatus(prev => ({ ...prev, isLoading: false }))
      return false
    }
  }, [syncStatus.canSync, syncStatus.nextSyncAvailable])

  // Auto-sync on page load if last sync was more than 30 minutes ago
  const autoSyncIfNeeded = useCallback(async () => {
    if (!syncStatus.lastSync) {
      // First time - trigger sync
      return await triggerSync()
    }

    const now = new Date()
    const timeDiff = now.getTime() - syncStatus.lastSync.getTime()
    const minutesDiff = timeDiff / (1000 * 60)

    // Auto-sync if last sync was more than 30 minutes ago
    if (minutesDiff >= 30) {
      return await triggerSync()
    }

    return false
  }, [syncStatus.lastSync, triggerSync])

  const getTimeUntilNextSync = useCallback(() => {
    if (!syncStatus.nextSyncAvailable) return null
    
    const now = new Date()
    const timeDiff = syncStatus.nextSyncAvailable.getTime() - now.getTime()
    const minutesLeft = Math.ceil(timeDiff / (1000 * 60))
    
    return minutesLeft > 0 ? minutesLeft : 0
  }, [syncStatus.nextSyncAvailable])

  return {
    ...syncStatus,
    triggerSync,
    autoSyncIfNeeded,
    getTimeUntilNextSync
  }
}
