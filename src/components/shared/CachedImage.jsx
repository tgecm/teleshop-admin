import { useState, useEffect, useRef } from 'react';
import { getCachedImageSrc } from '../../utils/imageCache';

export default function CachedImage({ src, alt, className, loading = 'lazy', ...props }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const blobRef = useRef(null);

  useEffect(() => {
    if (!src) return;
    let cancelled = false;

    if (blobRef.current) {
      URL.revokeObjectURL(blobRef.current);
      blobRef.current = null;
    }
    setBlobUrl(null);

    getCachedImageSrc(src).then(url => {
      if (!cancelled) {
        setBlobUrl(url);
        if (url !== src && url.startsWith('blob:')) {
          blobRef.current = url;
        }
      }
    });

    return () => { cancelled = true; };
  }, [src]);

  useEffect(() => {
    return () => {
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current);
      }
    };
  }, []);

  if (!src) return null;
  return <img src={blobUrl || src} alt={alt || ''} loading={loading} className={className} {...props} />;
}
