import { useState } from 'react';
import loadingGif from '../../assets/loading.gif';

type LoadingSplashProps = {
  message?: string;
  gifSrc?: string;
  compact?: boolean;
  fullArea?: boolean;
};

export function LoadingSplash({ message = 'Loading...', gifSrc = loadingGif, compact = false, fullArea = false }: LoadingSplashProps) {
  const [hasImageError, setHasImageError] = useState(false);

  const imageBoxStyle = fullArea
    ? {
        width: '100%',
        height: '100%',
        display: 'block',
      }
    : {
        width: compact ? 96 : 84,
        height: compact ? 96 : 84,
        display: 'grid',
        placeItems: 'center',
      };

  return (
    <div
      style={{
        width: fullArea ? '100%' : 'auto',
        height: fullArea ? '100%' : 'auto',
        minHeight: compact ? 'auto' : fullArea ? '100%' : '100vh',
        display: 'grid',
        placeItems: fullArea ? 'stretch' : 'center',
        background: compact ? 'transparent' : 'var(--color-bg-main)',
        color: 'var(--color-text-main)',
      }}
    >
      <div
        style={{
          width: fullArea ? '100%' : 'auto',
          height: fullArea ? '100%' : 'auto',
          display: 'grid',
          justifyItems: fullArea ? 'stretch' : 'center',
          alignContent: fullArea ? 'stretch' : 'center',
          gap: fullArea ? 0 : 16,
          overflow: 'hidden',
        }}
      >
        <div style={imageBoxStyle}>
          {!hasImageError ? (
            <img
              src={gifSrc}
              alt="Loading"
              onError={() => setHasImageError(true)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: fullArea ? 'cover' : 'contain',
                display: 'block',
              }}
            />
          ) : (
            <div
              aria-hidden="true"
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                border: '4px solid rgba(0, 0, 0, 0.12)',
                borderTopColor: 'var(--color-primary)',
                animation: 'loadingSplashSpin 0.9s linear infinite',
              }}
            />
          )}
        </div>
        {!fullArea ? <p style={{ margin: 0, fontSize: 14, opacity: 0.8 }}>{message}</p> : null}
      </div>
      <style>{`
        @keyframes loadingSplashSpin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}