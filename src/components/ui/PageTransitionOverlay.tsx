'use client';

import { useState, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export function PageTransitionOverlay() {
  const [isNavigating, setIsNavigating] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Reset navigation state when URL changes (navigation complete)
  useEffect(() => {
    setIsNavigating(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Find the closest anchor tag
      const target = (e.target as HTMLElement).closest('a');
      
      if (target && target.href && target.target !== '_blank') {
        try {
          const currentUrl = new URL(window.location.href);
          const targetUrl = new URL(target.href);
          
          // Only trigger for internal links that actually change the route
          if (
            targetUrl.origin === currentUrl.origin && 
            targetUrl.pathname !== currentUrl.pathname
          ) {
            setIsNavigating(true);
          }
        } catch (error) {
          // Ignore invalid URLs
        }
      }
    };

    // Capture clicks at the document level
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, []);

  return (
    <AnimatePresence>
      {isNavigating && (
        <motion.div
          initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          animate={{ opacity: 1, backdropFilter: 'blur(12px)' }}
          exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/20"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center gap-12 relative z-10"
          >
            {/* 3D Orbital Canvas */}
            <div className="relative w-32 h-32 flex items-center justify-center [perspective:1000px]">
              
              {/* Abstract Orbital Ring 1 */}
              <motion.div
                className="absolute inset-0 border-[1px] border-white/20 rounded-full"
                animate={{ rotateX: [0, 360], rotateY: [0, 180], rotateZ: [0, 360] }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                style={{ transformStyle: "preserve-3d" }}
              />

              {/* Abstract Orbital Ring 2 (Golden) */}
              <motion.div
                className="absolute inset-2 border-[1px] border-[var(--primary)]/40 rounded-full shadow-[inset_0_0_15px_rgba(245,166,35,0.1)]"
                animate={{ rotateX: [0, -360], rotateY: [0, 360], rotateZ: [0, -180] }}
                transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                style={{ transformStyle: "preserve-3d" }}
              />

              {/* Orbiting White Particle (Scanner) */}
              <motion.div
                className="absolute inset-0"
                animate={{ rotateZ: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_10px_2px_rgba(255,255,255,0.8)]" />
              </motion.div>

              {/* Orbiting Golden Particle */}
              <motion.div
                className="absolute inset-2"
                animate={{ rotateZ: -360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              >
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-[var(--primary)] rounded-full shadow-[0_0_12px_3px_rgba(245,166,35,0.8)]" />
              </motion.div>

              {/* Central Glowing Rice Grain (Abstract Geometry) */}
              <motion.div
                className="relative z-10"
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <motion.svg 
                  width="24" 
                  height="44" 
                  viewBox="0 0 24 40" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                  animate={{ filter: ['drop-shadow(0 0 10px rgba(245,166,35,0.5))', 'drop-shadow(0 0 25px rgba(245,166,35,1))', 'drop-shadow(0 0 10px rgba(245,166,35,0.5))'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <defs>
                    <linearGradient id="goldGrain" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FFE066" />
                      <stop offset="50%" stopColor="#F5A623" />
                      <stop offset="100%" stopColor="#B37700" />
                    </linearGradient>
                    <linearGradient id="grainHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="white" stopOpacity="0.8" />
                      <stop offset="50%" stopColor="white" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  
                  {/* Base Golden Grain */}
                  <path d="M12 0C12 0 2 10 2 20C2 30 12 40 12 40C12 40 22 30 22 20C22 10 12 0 12 0Z" fill="url(#goldGrain)" />
                  
                  {/* Left Side Highlight for 3D Volume */}
                  <path d="M12 2C12 2 4 11 4 20C4 29 12 38 12 38C12 38 16 29 16 20C16 11 12 2 12 2Z" fill="url(#grainHighlight)" opacity="0.4" />
                  
                  {/* Signature Center Crease of a Rice Grain */}
                  <path d="M12 6L12 34" stroke="#8A5A00" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
                </motion.svg>
              </motion.div>
            </div>

            {/* Typography and Loading Bar */}
            <div className="flex flex-col items-center gap-4">
              <motion.p
                className="text-white/90 font-light tracking-[0.5em] text-xs uppercase"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              >
                Milling Data...
              </motion.p>
              
              {/* Sleek Minimalist Progress Bar */}
              <div className="w-40 h-[1px] bg-white/10 relative overflow-hidden rounded-full">
                <motion.div 
                  className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-[#F5A623] to-transparent"
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
