import React, { useEffect, useState } from 'react';
import { InteractionManager, View } from 'react-native';

interface DeferredRenderProps {
  children: React.ReactNode;
  /** Optional placeholder shown while the real children are deferred. */
  placeholder?: React.ReactNode;
  /** Hard ceiling so we never leave the user staring at a blank space if the
   *  interaction queue never drains (rare but possible). */
  fallbackTimeoutMs?: number;
}

/**
 * Renders `children` only after the current React Navigation transition (or
 * any other running animation) finishes. Great for chart / heavy list sections
 * that dominate a screen's initial render cost but aren't above the fold.
 *
 * `InteractionManager.runAfterInteractions` is a much lighter-weight primitive
 * than lazy-loading / Suspense and fits RN's frame scheduler.
 */
export const DeferredRender: React.FC<DeferredRenderProps> = ({
  children,
  placeholder = null,
  fallbackTimeoutMs = 600,
}) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const handle = InteractionManager.runAfterInteractions(() => {
      setReady(true);
    });
    // Safety net — if something keeps the interaction queue busy indefinitely
    // we still render after a short delay.
    timeout = setTimeout(() => setReady(true), fallbackTimeoutMs);

    return () => {
      handle.cancel?.();
      if (timeout) clearTimeout(timeout);
    };
  }, [fallbackTimeoutMs]);

  if (!ready) return <View>{placeholder}</View>;
  return <>{children}</>;
};
