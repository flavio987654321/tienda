import { useRef } from "react";

export function useTouchSwipe(onSwipeLeft: () => void, onSwipeRight: () => void) {
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const cbLeft  = useRef(onSwipeLeft);
  const cbRight = useRef(onSwipeRight);
  cbLeft.current  = onSwipeLeft;
  cbRight.current = onSwipeRight;

  return {
    onTouchStart: (e: React.TouchEvent) => {
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
    },
    onTouchEnd: (e: React.TouchEvent) => {
      if (startX.current === null || startY.current === null) return;
      const dx = startX.current - e.changedTouches[0].clientX;
      const dy = Math.abs(startY.current - e.changedTouches[0].clientY);
      if (Math.abs(dx) > 50 && Math.abs(dx) > dy * 1.5) {
        if (dx > 0) cbLeft.current();
        else cbRight.current();
      }
      startX.current = null;
      startY.current = null;
    },
  };
}
