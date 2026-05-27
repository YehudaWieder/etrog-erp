import { useState } from 'react';
import { HomeIcon } from '../ui/HomeIcon';

type BrandLogoProps = {
  src?: string;
  alt: string;
  size?: number;
};

export function BrandLogo({ src, alt, size = 24 }: BrandLogoProps) {
  const [hasImageError, setHasImageError] = useState(false);

  if (!src || hasImageError) {
    return <HomeIcon aria-hidden="true" style={{ fontSize: size, marginInlineEnd: 6 }} />;
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setHasImageError(true)}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        marginInlineEnd: 6,
        display: 'block',
      }}
    />
  );
}