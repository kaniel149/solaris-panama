import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Satellite, AlertTriangle } from 'lucide-react';

const cn = (...classes: (string | boolean | undefined | null)[]) =>
  classes.filter(Boolean).join(' ');

interface LeadSatelliteImageProps {
  lat: number;
  lng: number;
  zoom?: number;
  size?: string;
  className?: string;
  aspectRatio?: string;
}

export function LeadSatelliteImage({
  lat,
  lng,
  zoom = 18,
  size = '400x250',
  className,
  aspectRatio = '16/9',
}: LeadSatelliteImageProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [imgSrc, setImgSrc] = useState<string | null>(null);

  useEffect(() => {
    setStatus('loading');
    const url = `/api/roof-scan?action=satellite-image&lat=${lat}&lng=${lng}&zoom=${zoom}&size=${size}`;

    // Check if the image can load
    const img = new Image();
    img.onload = () => {
      setImgSrc(url);
      setStatus('loaded');
    };
    img.onerror = () => {
      setStatus('error');
    };
    img.src = url;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [lat, lng, zoom, size]);

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-t-xl bg-[#0a0a12]',
        className
      )}
      style={{ aspectRatio }}
    >
      {/* Loading state */}
      {status === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <motion.div
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Satellite className="w-6 h-6 text-[#555570]" />
          </motion.div>
          <div className="w-24 h-1 rounded-full bg-white/[0.06] overflow-hidden">
            <motion.div
              className="h-full bg-[#00ffcc]/30 rounded-full"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              style={{ width: '50%' }}
            />
          </div>
        </div>
      )}

      {/* Loaded image */}
      {status === 'loaded' && imgSrc && (
        <motion.img
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          src={imgSrc}
          alt="Satellite view"
          className="w-full h-full object-cover"
          loading="lazy"
        />
      )}

      {/* Error state */}
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-[#0a0a12]">
          <AlertTriangle className="w-5 h-5 text-[#555570]" />
          <span className="text-[10px] text-[#555570]">Satellite unavailable</span>
        </div>
      )}

      {/* Gradient overlay for text readability */}
      {status === 'loaded' && (
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a12]/60 via-transparent to-transparent pointer-events-none" />
      )}
    </div>
  );
}
