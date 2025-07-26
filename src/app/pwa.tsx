'use client';

import { useEffect } from 'react';

// PWA Service Worker Registration Component
export function PWARegistration() {
  useEffect(() => {
    // Registriere den Service Worker nur im Produktionsmodus und wenn der Browser PWAs unterstützt
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && window.location.hostname !== 'localhost') {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(registration => {
            console.log('Service Worker erfolgreich registriert:', registration.scope);
          })
          .catch(error => {
            console.error('Service Worker Registrierung fehlgeschlagen:', error);
          });
      });
    }
  }, []);

  // Diese Komponente rendert nichts sichtbares
  return null;
}

export default PWARegistration;
