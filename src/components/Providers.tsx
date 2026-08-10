'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';
import { Toaster } from 'sonner';
import { SessionProvider } from 'next-auth/react';

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  return (
    <SessionProvider>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            fontFamily: 'Space Grotesk, sans-serif',
            fontWeight: 700,
            border: '2px solid #1A1A18',
            borderRadius: '4px',
            boxShadow: '4px 4px 0px #1A1A18',
            background: '#FAFAF7',
            color: '#0D0D0B',
          },
        }}
      />
    </SessionProvider>
  );
}
