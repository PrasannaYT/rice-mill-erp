'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

type VisibilityState = 'visible' | 'hidden';

interface UseVisibilityStateOptions {
  /** Called when the tab becomes visible (user returns to the app) */
  onVisible?: () => void;
  /** Called when the tab becomes hidden (user switches away) */
  onHidden?: () => void;
}

/**
 * Hook for Page Visibility API lifecycle management.
 * 
 * When the user switches to WhatsApp or another app, iOS/Android will
 * freeze the tab to save battery. This hook lets components:
 * - Pause expensive operations when backgrounded
 * - Re-sync data when the user returns
 * - Reconnect WebSockets or polling on foreground
 */
export function useVisibilityState(options?: UseVisibilityStateOptions) {
  const [visibility, setVisibility] = useState<VisibilityState>(
    typeof document !== 'undefined' ? (document.visibilityState as VisibilityState) : 'visible'
  );
  const onVisibleRef = useRef(options?.onVisible);
  const onHiddenRef = useRef(options?.onHidden);

  // Keep refs current without triggering re-renders
  useEffect(() => {
    onVisibleRef.current = options?.onVisible;
    onHiddenRef.current = options?.onHidden;
  }, [options?.onVisible, options?.onHidden]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const state = document.visibilityState as VisibilityState;
      setVisibility(state);

      if (state === 'visible') {
        onVisibleRef.current?.();
      } else {
        onHiddenRef.current?.();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const isVisible = visibility === 'visible';
  const isHidden = visibility === 'hidden';

  return { visibility, isVisible, isHidden };
}
