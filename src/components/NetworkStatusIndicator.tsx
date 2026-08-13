'use client';

import { useState, useEffect } from 'react';
import { WifiOff, SignalLow, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function NetworkStatusIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [isSlow, setIsSlow] = useState(false);
  const [offlineSince, setOfflineSince] = useState<number | null>(null);
  const [isLongOffline, setIsLongOffline] = useState(false);

  useEffect(() => {
    // Initial state check
    setIsOnline(navigator.onLine);
    if (!navigator.onLine) {
      setOfflineSince(Date.now());
    }

    const checkConnectionQuality = () => {
      // @ts-ignore - Network Information API is not fully standardized in TypeScript
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      
      if (connection) {
        const effectiveType = connection.effectiveType;
        const downlink = connection.downlink;
        
        // Define 'slow' as 2g/slow-2g or downlink < 1 Mbps
        if (effectiveType === '2g' || effectiveType === 'slow-2g' || (downlink !== undefined && downlink < 1)) {
          setIsSlow(true);
        } else {
          setIsSlow(false);
        }
      }
    };

    const handleOnline = () => {
      setIsOnline(true);
      setOfflineSince(null);
      setIsLongOffline(false);
      checkConnectionQuality();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsSlow(false);
      setOfflineSince(Date.now());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Monitor connection quality changes if supported
    // @ts-ignore
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
      connection.addEventListener('change', checkConnectionQuality);
      checkConnectionQuality();
    }

    // Timer to detect 'long offline' state
    const timerInterval = setInterval(() => {
      if (!isOnline && offlineSince) {
        const elapsed = Date.now() - offlineSince;
        // If offline for more than 15 seconds, trigger long offline state
        if (elapsed > 15000) {
          setIsLongOffline(true);
        }
      }
    }, 1000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener('change', checkConnectionQuality);
      }
      clearInterval(timerInterval);
    };
  }, [isOnline, offlineSince]);

  // Full-screen blocking modal for long offline periods
  if (isLongOffline) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-[var(--surface)] border-2 border-rose-500 shadow-[8px_8px_0px_#f43f5e] p-8 max-w-md w-full text-center space-y-6"
        >
          <div className="flex justify-center">
            <div className="bg-rose-100 p-4 rounded-full border border-rose-200">
              <WifiOff className="w-12 h-12 text-rose-600 animate-pulse" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-black text-[var(--text)] mb-2">No Internet Connection</h2>
            <p className="text-[var(--muted)]">
              You have been offline for a while. To prevent data loss and ensure system integrity, please reconnect to the internet to continue working.
            </p>
          </div>
          <div className="text-sm font-semibold text-rose-600 bg-rose-50 py-3 border border-rose-200">
            Waiting for connection...
          </div>
        </motion.div>
      </div>
    );
  }

  // Floating toast indicators for slow or disconnected states
  return (
    <AnimatePresence>
      {(!isOnline || isSlow) && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-0 left-0 right-0 md:bottom-6 md:left-auto md:right-6 z-[9998] w-full md:w-auto"
        >
          {!isOnline ? (
            <div className="flex items-center justify-center md:justify-start gap-3 bg-rose-500 text-white px-5 py-3 md:shadow-[4px_4px_0px_#9f1239] border-t md:border border-rose-700">
              <WifiOff className="w-5 h-5 animate-pulse" />
              <div>
                <p className="font-bold text-sm">You are offline</p>
                <p className="text-xs text-rose-100 font-medium">Reconnecting...</p>
              </div>
            </div>
          ) : isSlow ? (
            <div className="flex items-center justify-center md:justify-start gap-3 bg-amber-400 text-amber-900 px-5 py-3 md:shadow-[4px_4px_0px_#b45309] border-t md:border border-amber-600">
              <SignalLow className="w-5 h-5" />
              <div>
                <p className="font-bold text-sm">Slow Connection</p>
                <p className="text-xs text-amber-800 font-medium">Actions may take longer than usual</p>
              </div>
            </div>
          ) : null}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
