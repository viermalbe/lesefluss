import { useEffect, useState, RefObject } from 'react';
import { useRouter } from 'next/navigation';

interface NavigationGesturesOptions {
  onNext?: () => void;
  onPrevious?: () => void;
  onBack?: () => void;
  containerRef?: RefObject<HTMLElement | null>;
  enabled?: boolean;
}

/**
 * Hook to handle swipe gestures and keyboard navigation
 * 
 * @param options Configuration options for navigation gestures
 * @returns Object with navigation state and handlers
 */
export function useNavigationGestures({
  onNext,
  onPrevious,
  onBack,
  containerRef,
  enabled = true,
}: NavigationGesturesOptions) {
  const router = useRouter();
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);
  
  // Minimum distance required for a swipe to be registered
  const minSwipeDistance = 50;

  // Handle touch events for swipe detection
  useEffect(() => {
    if (!enabled) return;

    const container = containerRef?.current || document;

    const handleTouchStart = (e: Event) => {
      const touchEvent = e as TouchEvent;
      setTouchStartX(touchEvent.targetTouches[0].clientX);
      setIsSwiping(true);
    };

    const handleTouchMove = (e: Event) => {
      const touchEvent = e as TouchEvent;
      if (!touchStartX) return;
      setTouchEndX(touchEvent.targetTouches[0].clientX);
    };

    const handleTouchEnd = () => {
      if (!touchStartX || !touchEndX) {
        setIsSwiping(false);
        return;
      }

      const distance = touchEndX - touchStartX;
      const isLeftSwipe = distance < -minSwipeDistance;
      const isRightSwipe = distance > minSwipeDistance;

      if (isLeftSwipe && onNext) {
        onNext();
      } else if (isRightSwipe && onPrevious) {
        onPrevious();
      }

      // Reset touch coordinates
      setTouchStartX(null);
      setTouchEndX(null);
      setIsSwiping(false);
    };

    // Add touch event listeners
    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchmove', handleTouchMove);
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      // Remove touch event listeners on cleanup
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [touchStartX, touchEndX, onNext, onPrevious, enabled, containerRef, minSwipeDistance]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore key events in input fields
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case 'ArrowRight':
          if (onNext) {
            e.preventDefault();
            onNext();
          }
          break;
        case 'ArrowLeft':
          if (onPrevious) {
            e.preventDefault();
            onPrevious();
          }
          break;
        case 'Escape':
          if (onBack) {
            e.preventDefault();
            onBack();
          }
          break;
        default:
          break;
      }
    };

    // Add keyboard event listener
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      // Remove keyboard event listener on cleanup
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onNext, onPrevious, onBack, enabled]);

  return {
    isSwiping,
  };
}
