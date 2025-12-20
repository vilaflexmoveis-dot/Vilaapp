
import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';

export interface SignaturePadRef {
  clear: () => void;
  getSignature: () => string | undefined;
}

interface SignaturePadProps {
    className?: string;
}

const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(({ className }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number, y: number } | null>(null);

  const getCanvasContext = () => canvasRef.current?.getContext('2d');

  const getCoordinates = (event: MouseEvent | TouchEvent) => {
      if (!canvasRef.current) return null;
      const rect = canvasRef.current.getBoundingClientRect();
      if (event instanceof MouseEvent) {
          return { x: event.clientX - rect.left, y: event.clientY - rect.top };
      }
      if ('touches' in event && event.touches.length > 0) {
          return { x: event.touches[0].clientX - rect.left, y: event.touches[0].clientY - rect.top };
      }
      return null;
  };

  const startDrawing = (event: MouseEvent | TouchEvent) => {
      // Previne scroll enquanto desenha
      if (event.cancelable) event.preventDefault();
      isDrawing.current = true;
      lastPos.current = getCoordinates(event);
  };
  
  const draw = (event: MouseEvent | TouchEvent) => {
      if (event.cancelable) event.preventDefault();
      if (!isDrawing.current) return;
      const ctx = getCanvasContext();
      const currentPos = getCoordinates(event);
      if (ctx && lastPos.current && currentPos) {
          ctx.beginPath();
          ctx.moveTo(lastPos.current.x, lastPos.current.y);
          ctx.lineTo(currentPos.x, currentPos.y);
          ctx.stroke();
          lastPos.current = currentPos;
      }
  };

  const stopDrawing = (event: MouseEvent | TouchEvent) => {
      if (event.cancelable) event.preventDefault();
      isDrawing.current = false;
      lastPos.current = null;
  };

  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Salva o conteúdo atual antes de redimensionar (redimensionar limpa o canvas)
    const tempImage = canvas.toDataURL();

    const scale = window.devicePixelRatio || 1;
    canvas.width = Math.floor(canvas.offsetWidth * scale);
    canvas.height = Math.floor(canvas.offsetHeight * scale);
    
    ctx.scale(scale, scale);
    ctx.strokeStyle = '#1e293b'; // slate-800
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Restaura a imagem se houver
    const img = new Image();
    img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.offsetWidth, canvas.offsetHeight);
    };
    img.src = tempImage;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    resizeCanvas();
    
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);

    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing, { passive: false });

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('orientationchange', resizeCanvas);

    return () => {
        canvas.removeEventListener('mousedown', startDrawing);
        canvas.removeEventListener('mousemove', draw);
        canvas.removeEventListener('mouseup', stopDrawing);
        canvas.removeEventListener('mouseleave', stopDrawing);
        canvas.removeEventListener('touchstart', startDrawing);
        canvas.removeEventListener('touchmove', draw);
        canvas.removeEventListener('touchend', stopDrawing);
        window.removeEventListener('resize', resizeCanvas);
        window.removeEventListener('orientationchange', resizeCanvas);
    };
  }, []);

  useImperativeHandle(ref, () => ({
    clear: () => {
      const canvas = canvasRef.current;
      const ctx = getCanvasContext();
      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    },
    getSignature: () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const blank = document.createElement('canvas');
        blank.width = canvas.width;
        blank.height = canvas.height;
        return canvas.toDataURL('image/png') === blank.toDataURL('image/png') ? undefined : canvas.toDataURL('image/png');
      }
      return undefined;
    }
  }));

  return (
    <canvas ref={canvasRef} className={`touch-none ${className || ''}`} />
  );
});

export default SignaturePad;
