'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';

const IDLE_TIMEOUT_MS = 9 * 60 * 1000; // 9 minutes auto signout
const WARNING_BEFORE_MS = 60 * 1000; // 1 minute warning (triggers at 8 minutes)

export function IdleTimeoutProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  
  const [showWarning, setShowWarning] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = useCallback(() => {
    if (status !== 'authenticated') return;

    setShowWarning(false);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);

    warningRef.current = setTimeout(() => {
      setShowWarning(true);
    }, IDLE_TIMEOUT_MS - WARNING_BEFORE_MS);

    timeoutRef.current = setTimeout(() => {
      signOut({ callbackUrl: '/login?expired=1' });
    }, IDLE_TIMEOUT_MS);
  }, [status]);

  useEffect(() => {
    if (status !== 'authenticated') return;

    const events = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'];
    
    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    resetTimer();

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
    };
  }, [resetTimer, status, pathname]);

  return (
    <>
      {children}
      
      {showWarning && (
        <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#1a1315] border border-red-600 rounded-lg max-w-md w-full p-6 text-center shadow-[0_0_40px_rgba(220,38,38,0.3)] animate-pulse">
            <h2 className="text-2xl font-bold text-red-500 mb-2">Session Expiring!</h2>
            <p className="text-red-200 mb-6">You have been idle for too long. For security reasons, you will be logged out in 60 seconds.</p>
            <button 
              onClick={resetTimer}
              className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-8 rounded-full transition-colors shadow-lg"
            >
              I'm Still Here
            </button>
          </div>
        </div>
      )}
    </>
  );
}
