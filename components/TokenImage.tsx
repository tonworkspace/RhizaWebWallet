import React, { useState, useEffect } from 'react';

// Session-level cache of URLs that failed to load — avoids re-requesting broken images
const failedUrls = new Set<string>();

interface TokenImageProps {
  src?: string;
  alt: string;
  emoji?: string;
  className?: string;
}

/**
 * Renders a token image with an emoji fallback.
 * Failed image URLs are cached in memory for the session so broken CDN
 * images skip the network entirely on subsequent renders.
 */
const TokenImage: React.FC<TokenImageProps> = ({ src, alt, emoji = '🪙', className = '' }) => {
  const [failed, setFailed] = useState(() => !src || failedUrls.has(src));

  // Reset if src changes
  useEffect(() => {
    if (src) setFailed(failedUrls.has(src));
    else setFailed(true);
  }, [src]);

  if (failed || !src) {
    return <span className={`flex items-center justify-center text-xl ${className}`}>{emoji}</span>;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`object-cover ${className}`}
      onError={() => {
        if (src) failedUrls.add(src);
        setFailed(true);
      }}
    />
  );
};

export default TokenImage;
