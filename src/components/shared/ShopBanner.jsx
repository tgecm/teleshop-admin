import { useState, useEffect, useCallback, useRef } from 'react';

import { API_BASE } from '../../api/config';

export default function ShopBanner({ banners, botId, theme, children }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const intervalRef = useRef(null);

  const hasBanners = banners && banners.length > 0;
  const slideCount = hasBanners ? banners.length : 0;

  const getBannerUrl = useCallback((fileId) => {
    return fileId ? `${API_BASE}/telegram/file/${encodeURIComponent(fileId)}?bot_id=${botId}` : null;
  }, [botId]);

  const goToSlide = useCallback((index) => {
    if (index < 0) setCurrentSlide(slideCount - 1);
    else if (index >= slideCount) setCurrentSlide(0);
    else setCurrentSlide(index);
  }, [slideCount]);

  useEffect(() => {
    if (slideCount <= 1) return;
    intervalRef.current = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slideCount);
    }, 5000);
    return () => clearInterval(intervalRef.current);
  }, [slideCount]);

  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      goToSlide(diff > 0 ? currentSlide + 1 : currentSlide - 1);
    }
    setTouchStart(null);
  };

  if (!hasBanners) {
    return (
      <div className="relative aspect-[16/9] md:aspect-[3/1] overflow-hidden bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-white/5 rounded-full" />
        <div className="absolute top-1/2 left-1/3 w-32 h-32 bg-white/5 rounded-full" />
        <div className="absolute inset-0 bg-black/20" />
        {children}
      </div>
    );
  }

  return (
    <div className="relative aspect-[16/9] md:aspect-[3/1] overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slides */}
      {banners.map((banner, i) => (
        <a
          key={banner.file_id}
          href={banner.link || undefined}
          target={banner.link ? "_blank" : undefined}
          rel={banner.link ? "noopener noreferrer" : undefined}
          className={`absolute inset-0 transition-opacity duration-700 block ${i === currentSlide ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
          <img
            src={getBannerUrl(banner.file_id)}
            alt={`Banner ${i + 1}`}
            className="w-full h-full object-cover object-center"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </a>
      ))}

      {/* Gradient overlay for readability on any banner color */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/40 pointer-events-none" />

      {/* Content overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="pointer-events-auto">
          {children}
        </div>
      </div>

    </div>
  );
}
