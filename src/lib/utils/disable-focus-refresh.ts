'use client'

/**
 * Dieses Utility verhindert das automatische Neuladen der Seite beim Fokuswechsel
 * durch Überschreiben der document.visibilityState-Eigenschaft
 */
export function disableFocusRefresh() {
  if (typeof window === 'undefined') return

  // Speichere die originale visibilityState-Eigenschaft
  const originalVisibilityState = document.visibilityState

  // Überschreibe die visibilityState-Getter-Methode
  Object.defineProperty(Document.prototype, 'visibilityState', {
    get: function() {
      // Gib immer "visible" zurück, unabhängig vom tatsächlichen Status
      return 'visible'
    }
  })

  // Verhindere das Auslösen von visibilitychange-Events
  const originalAddEventListener = EventTarget.prototype.addEventListener
  EventTarget.prototype.addEventListener = function(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) {
    if (type === 'visibilitychange') {
      // Ignoriere visibilitychange-Event-Listener
      console.log('Prevented visibilitychange event listener')
      return
    }
    return originalAddEventListener.call(this, type, listener, options)
  }

  console.log('Focus refresh disabled')
}
