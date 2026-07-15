import { useEffect, useRef, useState } from 'react';

type TopLoadingBarProps = {
  isLoading: boolean;
  // 'underline' (default): absolutely positioned — nest inside a `position: relative`
  // container so it sits flush against that container's bottom edge without adding layout height.
  // 'fixed-below-topbar': pinned to the viewport just under the app's top bar, at a high
  // z-index — use for the page-level bar, since it must paint above sticky content
  // regardless of DOM position (a plain absolute underline gets covered by other
  // positioned/sticky elements that come later in the tree).
  placement?: 'underline' | 'fixed-below-topbar';
};

// Duolingo-style thin progress bar: eases toward 90% while loading, then
// snaps to 100% and fades out once the data has actually finished loading.
export function TopLoadingBar({ isLoading, placement = 'underline' }: TopLoadingBarProps) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isLoading) {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
      setVisible(true);
      setProgress(8);
      intervalRef.current = setInterval(() => {
        setProgress((prev) => (prev >= 90 ? prev : prev + (90 - prev) * 0.08 + 0.5));
      }, 200);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setProgress((prev) => (prev > 0 ? 100 : 0));
      hideTimeoutRef.current = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 300);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isLoading]);

  useEffect(() => () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
  }, []);

  if (!visible) {
    return null;
  }

  const containerStyle: React.CSSProperties =
    placement === 'fixed-below-topbar'
      ? {
          position: 'fixed',
          top: 'var(--layout-topbar-height)',
          left: 0,
          right: 0,
          height: 3,
          overflow: 'hidden',
          zIndex: 1000,
          pointerEvents: 'none',
        }
      : {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: -3,
          height: 3,
          overflow: 'hidden',
          pointerEvents: 'none',
        };

  return (
    <div aria-hidden="true" style={containerStyle}>
      <div
        style={{
          height: '100%',
          width: `${progress}%`,
          background: '#ffc800',
          borderRadius: 2,
          transition: 'width 0.25s ease-out, opacity 0.25s ease-out',
          opacity: progress >= 100 ? 0 : 1,
        }}
      />
    </div>
  );
}
