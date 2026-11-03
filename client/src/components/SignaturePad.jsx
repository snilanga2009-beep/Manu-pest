import React, { useRef, useState, useEffect, useCallback } from 'react';
import { RotateCcw, Check, PenTool, X } from 'lucide-react';

export default function SignaturePad({ onSave, onCancel, title = 'Customer Touch Sign-off' }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Pointer/Touch coordinate extraction relative to canvas
  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX = e.clientX;
    let clientY = e.clientY;
    if (clientX === undefined && e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    }
    return {
      x: (clientX ?? 0) - rect.left,
      y: (clientY ?? 0) - rect.top
    };
  };

  // Set up crisp canvas dimensions matching real display size with high DPI retina support
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const dpr = Math.max(window.devicePixelRatio || 1, 1);
    const targetWidth = Math.round(rect.width * dpr);
    const targetHeight = Math.round(rect.height * dpr);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      let savedData = null;
      if (hasSignature && canvas.width > 0 && canvas.height > 0) {
        try {
          savedData = canvas.toDataURL();
        } catch (err) {}
      }

      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      ctx.strokeStyle = '#0f172a'; // Deep slate
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (savedData) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, rect.width, rect.height);
        };
        img.src = savedData;
      }
    }
  }, [hasSignature]);

  useEffect(() => {
    setupCanvas();
    const rafId = requestAnimationFrame(() => {
      setupCanvas();
    });
    const timer = setTimeout(setupCanvas, 120);
    const handleResize = () => setupCanvas();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [setupCanvas]);

  // Pointer / Touch drawing handlers with non-passive events and pointer capture
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let drawing = false;

    const onPointerDown = (e) => {
      e.preventDefault();
      drawing = true;
      setIsDrawing(true);
      try {
        if (canvas.setPointerCapture) {
          canvas.setPointerCapture(e.pointerId);
        }
      } catch (err) {}
      const { x, y } = getCoordinates(e);
      const ctx = canvas.getContext('2d');
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const onPointerMove = (e) => {
      if (!drawing) return;
      e.preventDefault();
      const { x, y } = getCoordinates(e);
      const ctx = canvas.getContext('2d');
      ctx.lineTo(x, y);
      ctx.stroke();
      setHasSignature(true);
    };

    const onPointerUp = (e) => {
      if (drawing) {
        drawing = false;
        setIsDrawing(false);
        try {
          if (canvas.releasePointerCapture) {
            canvas.releasePointerCapture(e.pointerId);
          }
        } catch (err) {}
      }
    };

    if (typeof window !== 'undefined' && window.PointerEvent) {
      canvas.addEventListener('pointerdown', onPointerDown, { passive: false });
      canvas.addEventListener('pointermove', onPointerMove, { passive: false });
      canvas.addEventListener('pointerup', onPointerUp, { passive: false });
      canvas.addEventListener('pointercancel', onPointerUp, { passive: false });
      return () => {
        canvas.removeEventListener('pointerdown', onPointerDown);
        canvas.removeEventListener('pointermove', onPointerMove);
        canvas.removeEventListener('pointerup', onPointerUp);
        canvas.removeEventListener('pointercancel', onPointerUp);
      };
    } else {
      const onTouchStart = (e) => {
        e.preventDefault();
        drawing = true;
        setIsDrawing(true);
        const { x, y } = getCoordinates(e);
        const ctx = canvas.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(x, y);
      };
      const onTouchMove = (e) => {
        if (!drawing) return;
        e.preventDefault();
        const { x, y } = getCoordinates(e);
        const ctx = canvas.getContext('2d');
        ctx.lineTo(x, y);
        ctx.stroke();
        setHasSignature(true);
      };
      const onTouchEnd = () => {
        drawing = false;
        setIsDrawing(false);
      };
      canvas.addEventListener('touchstart', onTouchStart, { passive: false });
      canvas.addEventListener('touchmove', onTouchMove, { passive: false });
      canvas.addEventListener('touchend', onTouchEnd, { passive: false });
      canvas.addEventListener('touchcancel', onTouchEnd, { passive: false });
      return () => {
        canvas.removeEventListener('touchstart', onTouchStart);
        canvas.removeEventListener('touchmove', onTouchMove);
        canvas.removeEventListener('touchend', onTouchEnd);
        canvas.removeEventListener('touchcancel', onTouchEnd);
      };
    }
  }, []);

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    setHasSignature(false);
  };

  const handleConfirm = () => {
    if (!hasSignature) return;
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
  };

  return (
    <div
      ref={containerRef}
      className="bg-white rounded-2xl p-3 sm:p-4 shadow-xl border-2 border-emerald-300 w-full max-w-full mx-auto select-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <PenTool className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="font-black text-slate-900 text-xs sm:text-sm truncate">{title}</h3>
            <p className="text-[10px] text-slate-500 truncate">Sign with finger inside box</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={clear}
            type="button"
            className="text-[11px] font-bold flex items-center gap-1 text-slate-600 hover:text-rose-600 px-2.5 py-1.5 rounded-lg bg-slate-100 active:bg-slate-200 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Clear
          </button>
          {onCancel && (
            <button
              onClick={onCancel}
              type="button"
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Signature Canvas Box with safe touch bounds */}
      <div className="mt-2.5 relative border-2 border-dashed border-emerald-300 rounded-xl bg-slate-50/90 overflow-hidden" style={{ touchAction: 'none' }}>
        <canvas
          ref={canvasRef}
          className="w-full h-36 sm:h-44 block cursor-crosshair"
          style={{ touchAction: 'none' }}
        />
        {!hasSignature && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-400 text-xs gap-1 px-4 text-center">
            <span className="font-bold text-slate-600 text-xs sm:text-sm">✍️ Sign here with your finger</span>
            <span className="text-[10px] text-slate-400">Touch and draw your signature smoothly inside</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          onClick={clear}
          type="button"
          className="text-xs font-bold flex items-center justify-center gap-1 text-slate-600 hover:text-rose-600 px-3 py-2.5 rounded-xl bg-slate-100 active:bg-slate-200 transition cursor-pointer min-h-[42px]"
        >
          <RotateCcw className="w-4 h-4" /> Clear
        </button>

        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3.5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer min-h-[42px]"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!hasSignature}
            className={`flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-black rounded-xl shadow-md transition cursor-pointer min-h-[42px] ${
              hasSignature
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 active:scale-98'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-70'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>Confirm Signature</span>
          </button>
        </div>
      </div>
    </div>
  );
}
