'use client'

import { useRouter } from 'next/navigation'
import { Clock, Calendar, Heart, Archive, Mail, MailOpen } from 'lucide-react'
import { getRelativeTime, getEstimatedReadingTime } from '@/lib/utils/content-utils'
import { OptimizedImage } from '@/components/ui/optimized-image'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface EnhancedEntryCardProps {
  entry: {
    id: string
    title: string
    content_html: string
    published_at: string
    status: 'read' | 'unread'
    starred: boolean
    archived: boolean
    subscription: {
      id: string
      title: string
      status: string
      image_url?: string | null
    }
  }
  // Callbacks mit klaren Parametern:
  // entryId: Die ID des Eintrags
  // newValue: Der NEUE Wert nach der Änderung (nicht der aktuelle/alte Wert)
  onToggleReadStatus: (entryId: string, newStatus: string) => void
  onToggleStarred?: (entryId: string, newStarredValue: boolean) => void
  onToggleArchived?: (entryId: string, newArchivedValue: boolean) => void
}

// Hilfsfunktion zum Extrahieren des ersten Bildes aus HTML-Inhalt
const getFirstImageFromHtml = (html: string): string | null => {
  const imgMatches = html.match(/<img[^>]+src="([^"]+)"[^>]*>/gi)
  if (!imgMatches) return null
  
  for (const imgTag of imgMatches) {
    const srcMatch = imgTag.match(/src="([^"]+)"/i)
    if (!srcMatch) continue
    
    const src = srcMatch[1]
    
    // Skip common tracking pixel patterns
    if (
      src.includes('track') ||
      src.includes('pixel') ||
      src.includes('beacon') ||
      src.includes('analytics') ||
      src.includes('1x1') ||
      src.includes('transparent') ||
      src.endsWith('.gif') && src.includes('1bwq5') // WIRED tracking pattern
    ) {
      continue
    }
    
    // Skip very small images (likely tracking)
    const widthMatch = imgTag.match(/width=["']?(\d+)/i)
    const heightMatch = imgTag.match(/height=["']?(\d+)/i)
    if (widthMatch && heightMatch) {
      const width = parseInt(widthMatch[1])
      const height = parseInt(heightMatch[1])
      if (width < 50 || height < 50) continue
    }
    
    return src
  }
  
  return null
}

export function EnhancedEntryCard({ entry, onToggleReadStatus, onToggleStarred, onToggleArchived }: EnhancedEntryCardProps) {
  const router = useRouter()

  const relativeTime = getRelativeTime(entry.published_at)
  const readingTime = getEstimatedReadingTime(entry.content_html)
  const isUnread = entry.status === 'unread'

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on action buttons
    if ((e.target as HTMLElement).closest('button')) {
      return
    }
    // Wähle den richtigen Pfad basierend auf dem Archivstatus
    const basePath = entry.archived ? '/archive/' : '/issues/'
    router.push(`${basePath}${entry.id}`)
  }

  const handleToggleRead = async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    try {
      // Berechne den neuen Status
      const newStatus = entry.status === 'read' ? 'unread' : 'read'
      
      // Bereite die Daten für das Update vor
      const updateData: { status: 'read' | 'unread'; archived?: boolean } = { status: newStatus }
      
      // Wenn ein Eintrag auf ungelesen gesetzt wird und archiviert ist, entferne den Archiv-Status
      if (newStatus === 'unread' && entry.archived) {
        updateData.archived = false
      }
      
      // OPTIMISTISCHE UI-AKTUALISIERUNG: Zuerst die Callbacks aufrufen, um die UI sofort zu aktualisieren
      
      // 1. Status aktualisieren
      if (onToggleReadStatus) {
        onToggleReadStatus(entry.id, newStatus)
      }
      
      // 2. Wenn sich der Archiv-Status ändert (beim Setzen auf ungelesen)
      if (newStatus === 'unread' && entry.archived && onToggleArchived) {
        onToggleArchived(entry.id, false)
      }
      
      // Danach die API-Anfrage senden
      const { error } = await supabase
        .from('entries')
        .update(updateData)
        .eq('id', entry.id)
      
      if (error) {
        // Bei Fehler: Fehlermeldung anzeigen und UI-Update rückgängig machen
        toast.error(`Failed to update status: ${error.message}`)
        
        // UI-Update rückgängig machen
        if (onToggleReadStatus) {
          onToggleReadStatus(entry.id, entry.status) // Zurück zum ursprünglichen Wert
        }
        
        if (newStatus === 'unread' && entry.archived && onToggleArchived) {
          onToggleArchived(entry.id, true) // Archiv-Status wiederherstellen
        }
        
        return
      }
      
      // Erfolgreiche Aktualisierung - keine Toast-Nachricht für Statusänderungen
      // Wenn ein Eintrag auf ungelesen gesetzt wurde und archiviert war, zeige Nachricht
      if (newStatus === 'unread' && entry.archived) {
        toast.success('Issue removed from archive')
      }
    } catch (error: any) {
      toast.error(`Failed to update status: ${error.message}`)
    }
  }

  const handleToggleStarred = async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    try {
      // Berechne den neuen Like-Status
      const newStarred = !entry.starred
      
      // Bereite die Daten für das Update vor
      const updateData: { starred: boolean; archived?: boolean } = { starred: newStarred }
      
      // Wenn ein Eintrag geliked wird und archiviert ist, entferne den Archiv-Status
      if (newStarred && entry.archived) {
        updateData.archived = false
      }
      
      // OPTIMISTISCHE UI-AKTUALISIERUNG: Zuerst die Callbacks aufrufen, um die UI sofort zu aktualisieren
      
      // 1. Like-Status aktualisieren
      if (onToggleStarred) {
        onToggleStarred(entry.id, newStarred)
      }
      
      // 2. Wenn sich der Archiv-Status ändert (beim Liken eines archivierten Eintrags)
      if (newStarred && entry.archived && onToggleArchived) {
        onToggleArchived(entry.id, false)
      }
      
      // Danach die API-Anfrage senden
      const { error } = await supabase
        .from('entries')
        .update(updateData)
        .eq('id', entry.id)

      if (error) {
        // Bei Fehler: Fehlermeldung anzeigen und UI-Update rückgängig machen
        toast.error(`Failed to ${entry.starred ? 'unstar' : 'star'} issue: ${error.message}`)
        
        // UI-Update rückgängig machen
        if (onToggleStarred) {
          onToggleStarred(entry.id, entry.starred) // Zurück zum ursprünglichen Wert
        }
        
        if (newStarred && entry.archived && onToggleArchived) {
          onToggleArchived(entry.id, true) // Archiv-Status wiederherstellen
        }
        
        return
      }

      // Erfolgreiche Aktualisierung
      toast.success(`Issue ${entry.starred ? 'unstarred' : 'starred'} successfully`)
      
      // Wenn ein Eintrag geliked wurde und archiviert war, zeige zusätzliche Nachricht
      if (newStarred && entry.archived) {
        toast.success('Issue removed from archive')
      }
    } catch (error: any) {
      toast.error(`Failed to update starred status: ${error.message}`)
    }
  }

  const handleToggleArchived = async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    try {
      // Berechne den neuen Archiv-Status
      const newArchived = !entry.archived
      
      // Bereite die Daten für das Update vor
      const updateData: { 
        archived: boolean; 
        starred?: boolean; 
        status?: 'read' | 'unread' 
      } = { archived: newArchived }
      
      // Wenn ein Eintrag archiviert wird, setze auch den Status auf "read" und entferne den Like-Status
      if (newArchived) {
        updateData.status = 'read'
        updateData.starred = false
      }
      
      // OPTIMISTISCHE UI-AKTUALISIERUNG: Zuerst die Callbacks aufrufen, um die UI sofort zu aktualisieren
      
      // 1. Archiv-Status aktualisieren
      if (onToggleArchived) {
        onToggleArchived(entry.id, newArchived)
      }
      
      // 2. Wenn sich der Like-Status ändert (beim Archivieren wird Like entfernt)
      if (newArchived && entry.starred && onToggleStarred) {
        onToggleStarred(entry.id, false)
      }
      
      // 3. Wenn sich der Lese-Status ändert (beim Archivieren wird Status auf "read" gesetzt)
      if (newArchived && entry.status !== 'read' && onToggleReadStatus) {
        onToggleReadStatus(entry.id, 'read')
      }
      
      // Danach die API-Anfrage senden
      const { error } = await supabase
        .from('entries')
        .update(updateData)
        .eq('id', entry.id)

      if (error) {
        // Bei Fehler: Fehlermeldung anzeigen und UI-Update rückgängig machen
        toast.error(`Failed to ${entry.archived ? 'unarchive' : 'archive'} issue: ${error.message}`)
        
        // UI-Update rückgängig machen
        if (onToggleArchived) {
          onToggleArchived(entry.id, entry.archived) // Zurück zum ursprünglichen Wert
        }
        
        if (newArchived && entry.starred && onToggleStarred) {
          onToggleStarred(entry.id, true) // Like-Status wiederherstellen
        }
        
        if (newArchived && entry.status !== 'read' && onToggleReadStatus) {
          onToggleReadStatus(entry.id, entry.status) // Lese-Status wiederherstellen
        }
        
        return
      }
      
      // Erfolgreiche Aktualisierung
      toast.success(`Issue ${entry.archived ? 'unarchived' : 'archived'} successfully`)
    } catch (error: any) {
      toast.error(`Failed to update archived status: ${error.message}`)
    }
  }

  return (
    <Card
      className={cn(
        entry.status === 'unread' ? 'border-primary' : 'border-border'
      )}
      onClick={handleCardClick}
    >
      <CardContent className="relative">
        {/* Action Icons - Top right corner */}
        <div className="absolute -top-2 right-4 flex gap-1 z-10">

          
          {/* Read/Unread Status Icon */}
          <button
            onClick={handleToggleRead}
            className={`rounded-md p-1 hover:bg-muted/50 dark:hover:bg-muted/30 transition-colors ${
              isUnread ? 'text-primary' : 'text-muted-foreground'
            }`}
            title={isUnread ? 'Mark as read' : 'Mark as unread'}
          >
            {isUnread ? (
              <Mail className="w-4 h-4" />
            ) : (
              <MailOpen className="w-4 h-4" />
            )}
            <span className="sr-only">{isUnread ? 'New' : 'Opened'}</span>
          </button>
                    {/* Archive Icon */}
                    <button
            onClick={handleToggleArchived}
            className={`rounded-md p-1 hover:bg-muted/50 dark:hover:bg-muted/30 transition-colors ${
              entry.archived ? 'text-primary' : 'text-muted-foreground'
            }`}
            title={entry.archived ? 'Unarchive' : 'Archive'}
          >
            <Archive className="w-4 h-4" />
          </button>
          {/* Heart Icon for Favorites */}
          <button
            onClick={handleToggleStarred}
            className={`rounded-md p-1 hover:bg-muted/50 dark:hover:bg-muted/30 transition-colors ${
              entry.starred ? 'text-primary' : 'text-muted-foreground'
            }`}
            title={entry.starred ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart className={`w-4 h-4 ${
              entry.starred ? 'fill-primary dark:fill-primary' : ''
            }`} />
          </button>
        </div>

        {/* Main Content Layout */}
        <div className="flex gap-3 mb-0">
          {/* Preview Image - 64x64 */}
          <div className="w-12 h-12 overflow-hidden flex-shrink-0 rounded-md">
            <OptimizedImage 
              src={entry.subscription.image_url || getFirstImageFromHtml(entry.content_html)}
              alt={entry.title}
              className="w-full h-full object-contain"
              sourceId={entry.subscription.id}
            />
          </div>
          
          {/* Content - Source and Title */}
          <div className="flex-1 min-w-0" data-component-name="EnhancedEntryCard">
            
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1" data-component-name="EnhancedEntryCard">
              {entry.subscription.title}
            </div>
            
            <h3 className={`text-base line-clamp-2 leading-tight ${
              entry.status === 'read' ? 'text-muted-foreground' : 'text-foreground font-medium'
            }`} data-component-name="EnhancedEntryCard">
              {entry.title}
            </h3>
          </div>
        </div>

        {/* Meta Information Row */}
        <div className="space-y-3">
          
          {/* Meta Information */}
          <div className="flex items-center pt-4" data-component-name="EnhancedEntryCard">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{relativeTime}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{readingTime}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
