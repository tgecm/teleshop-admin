import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Download, Maximize2, Sparkles } from 'lucide-react';

export default function ZoomableQrModal({ isOpen, onClose, imgUrl, title = 'Payment QR Code', accountName, accountNumber }) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const touchStartDistRef = useRef(0);
  const touchStartScaleRef = useRef(1);
  const imgContainerRef = useRef(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setIsDragging(false);
    }
  }, [isOpen]);

  // Prevent background body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Helper for zoom level clamp
  const updateZoom = useCallback((newScale) => {
    const clamped = Math.min(Math.max(newScale, 1), 4);
    setScale(clamped);
    if (clamped === 1) {
      setPosition({ x: 0, y: 0 });
    }
  }, []);

  const handleZoomIn = () => updateZoom(scale + 0.5);
  const handleZoomOut = () => updateZoom(scale - 0.5);
  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Double tap / double click to toggle zoom
  const handleDoubleClick = () => {
    if (scale > 1.2) {
      handleReset();
    } else {
      updateZoom(2.5);
    }
  };

  // Mouse wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.25 : -0.25;
    updateZoom(scale + delta);
  };

  // Mouse Drag Panning
  const handleMouseDown = (e) => {
    if (scale <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || scale <= 1) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch Pinch & Drag Handling
  const getTouchDistance = (touches) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      // Start Pinch
      const dist = getTouchDistance(e.touches);
      touchStartDistRef.current = dist;
      touchStartScaleRef.current = scale;
    } else if (e.touches.length === 1 && scale > 1) {
      // Start Drag Pan
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y
      });
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && touchStartDistRef.current > 0) {
      // Pinching
      const currentDist = getTouchDistance(e.touches);
      const ratio = currentDist / touchStartDistRef.current;
      updateZoom(touchStartScaleRef.current * ratio);
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      // Dragging
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y
      });
    }
  };

  const handleTouchEnd = (e) => {
    if (e.touches.length < 2) {
      touchStartDistRef.current = 0;
    }
    if (e.touches.length === 0) {
      setIsDragging(false);
    }
  };

  if (!isOpen || !imgUrl) return null;

  const downloadUrl = imgUrl + (imgUrl.includes('?') ? '&' : '?') + 'download=payment_qr.jpg';

  return (
    <div
      className="fixed inset-0 z-[99999] bg-black/92 backdrop-blur-md flex flex-col justify-between select-none animate-fadeIn transition-all"
      onClick={onClose}
    >
      {/* Top Header Bar */}
      <div
        className="w-full p-4 flex items-center justify-between z-10 bg-gradient-to-b from-black/80 to-transparent"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col text-white">
          <h3 className="text-base font-bold flex items-center gap-2">
            <span>{title}</span>
            <span className="text-[10px] uppercase tracking-wider bg-white/10 text-white/80 px-2 py-0.5 rounded-full border border-white/10 font-mono">
              Fullscreen QR
            </span>
          </h3>
          {(accountName || accountNumber) && (
            <p className="text-xs text-white/60">
              {accountName && <span>{accountName}</span>}
              {accountName && accountNumber && <span className="mx-1">•</span>}
              {accountNumber && <span className="font-mono text-white/80">{accountNumber}</span>}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <a
            href={downloadUrl}
            download="payment_qr.jpg"
            className="p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all active:scale-95 flex items-center gap-1.5 text-xs font-semibold"
            title="Download QR"
            onClick={(e) => e.stopPropagation()}
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Save QR</span>
          </a>
          <button
            onClick={onClose}
            className="p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all active:scale-95"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Center Image Container */}
      <div
        ref={imgContainerRef}
        className="flex-1 w-full h-full flex items-center justify-center overflow-hidden relative cursor-grab active:cursor-grabbing touch-none"
        onClick={(e) => e.stopPropagation()}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={handleDoubleClick}
      >
        <div
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.15s cubic-bezier(0.2, 0, 0, 1)',
          }}
          className="p-4 bg-white rounded-3xl shadow-2xl flex items-center justify-center border-4 border-white/20 max-w-[90vw] max-h-[70vh]"
        >
          <img
            src={imgUrl}
            alt="Payment QR Fullscreen"
            className="max-w-full max-h-[60vh] object-contain rounded-xl pointer-events-none"
          />
        </div>

        {/* Pinch / Double-tap Help Hint Badge */}
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-black/65 backdrop-blur-md border border-white/15 text-white/90 px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 shadow-lg pointer-events-none">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span>Pinch to zoom • Double-tap to expand</span>
        </div>
      </div>

      {/* Bottom Floating Zoom Controls Bar */}
      <div
        className="w-full p-4 flex items-center justify-center z-10 bg-gradient-to-t from-black/80 to-transparent"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white/15 backdrop-blur-xl border border-white/20 rounded-full px-4 py-2 flex items-center gap-3 shadow-2xl text-white">
          <button
            onClick={handleZoomOut}
            disabled={scale <= 1}
            className="p-2 rounded-full hover:bg-white/20 disabled:opacity-40 disabled:hover:bg-transparent transition-all active:scale-90"
            title="Zoom Out"
          >
            <ZoomOut className="w-5 h-5" />
          </button>

          <span className="text-xs font-mono font-bold w-12 text-center text-white/90">
            {Math.round(scale * 100)}%
          </span>

          <button
            onClick={handleZoomIn}
            disabled={scale >= 4}
            className="p-2 rounded-full hover:bg-white/20 disabled:opacity-40 disabled:hover:bg-transparent transition-all active:scale-90"
            title="Zoom In"
          >
            <ZoomIn className="w-5 h-5" />
          </button>

          {scale !== 1 && (
            <button
              onClick={handleReset}
              className="p-2 rounded-full hover:bg-white/20 transition-all active:scale-90 border-l border-white/20 pl-3"
              title="Reset Zoom"
            >
              <RotateCcw className="w-4 h-4 text-white/80" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
