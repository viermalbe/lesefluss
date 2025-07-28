import { RefObject } from 'react';

interface NavigationGesturesOptions {
  onNext?: () => void;
  onPrevious?: () => void;
  onBack?: () => void;
  containerRef?: RefObject<HTMLElement | null>;
  enabled?: boolean;
}

/**
 * Diese Funktion wurde entfernt, da die Swipe-Navigation und Tastatur-Navigation nicht mehr benötigt werden.
 * Sie bleibt als Platzhalter, um bestehenden Code nicht zu brechen.
 * 
 * @param options Konfigurationsoptionen (werden nicht mehr verwendet)
 * @returns Ein leeres Objekt
 */
export function useNavigationGestures(_options: NavigationGesturesOptions) {
  // Die Funktionalität wurde entfernt
  return {
    isSwiping: false
  };
}
