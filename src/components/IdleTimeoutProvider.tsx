'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';

const IDLE_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours idle timeout for enterprise mill operations
const WARNING_BEFORE_MS = 2 * 60 * 1000; // 2 minute warning before logout
const LAST_ACTIVE_KEY = 'ricemill_last_active_timestamp';

export function IdleTimeoutProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const pathname = usePathname();
  
  const [showWarning, setShowWarning] = useState(false);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const updateLastActive = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
    }
    setShowWarning(false);
  }, []);

  const handleSignOut = useCallback(async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LAST_ACTIVE_KEY);
      sessionStorage.clear();
    }
    await signOut({ callbackUrl: '/login?expired=1', redirect: false });
    if (typeof window !== 'undefined') {
      window.location.href = '/login?expired=1';
    }
  }, []);

  const checkIdleStatus = useCallback(() => {
    if (status !== 'authenticated') return;
    if (typeof window === 'undefined') return;

    const lastActiveStr = localStorage.getItem(LAST_ACTIVE_KEY);
    const lastActive = lastActiveStr ? parseInt(lastActiveStr, 10) : Date.now();
    const elapsed = Date.now() - lastActive;

    if (elapsed >= IDLE_TIMEOUT_MS) {
      handleSignOut();
    } else if (elapsed >= IDLE_TIMEOUT_MS - WARNING_BEFORE_MS) {
      setShowWarning(true);
    } else {
      setShowWarning(false);
    }
  }, [status, handleSignOut]);

  useEffect(() => {
    if (status !== 'authenticated') return;

    updateLastActive();

    const events = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart', 'focus'];
    const handleUserActivity = () => {
      updateLastActive();
    };

    events.forEach(event => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === LAST_ACTIVE_KEY) {
        checkIdleStatus();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    checkIntervalRef.current = setInterval(checkIdleStatus, 10000); // Check every 10s

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
      window.removeEventListener('storage', handleStorageChange);
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    };
  }, [status, pathname, updateLastActive, checkIdleStatus]);

  return (
    <>
      {children}
      
      {showWarning && (
        <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#1a1315] border border-red-600 rounded-2xl max-w-md w-full p-6 text-center shadow-[0_0_40px_rgba(220,38,38,0.3)]">
            <h2 className="text-2xl font-bold text-red-500 mb-2 font-display">Session Expiring</h2>
            <p className="text-red-200 text-sm mb-6">You have been idle for a long period. For security, your session will end shortly.</p>
            <button 
              onClick={updateLastActive}
              className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg active:scale-95 cursor-pointer"
            >
              I&apos;m Still Working
            </button>
          </div>
        </div>
      )}
    </>
  );
}
