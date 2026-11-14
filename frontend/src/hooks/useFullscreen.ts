import { useCallback, useEffect, useState, type RefObject } from 'react';

/** Fullscreen API wrapper for one element. `supported` is false where the API is unavailable (e.g. iOS Safari). */
export function useFullscreen(ref: RefObject<HTMLElement | null>) {
  const supported = typeof document !== 'undefined' && Boolean(document.fullscreenEnabled);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === ref.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, [ref]);

  const toggle = useCallback(() => {
    if (!supported) return;
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    else void ref.current?.requestFullscreen().catch(() => undefined);
  }, [ref, supported]);

  return { supported, isFullscreen, toggle };
}
