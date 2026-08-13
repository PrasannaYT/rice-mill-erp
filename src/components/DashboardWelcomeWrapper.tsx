'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ERPWelcomeSplash from '@/components/ERPWelcomeSplash';
import { useSession } from 'next-auth/react';

export default function DashboardWelcomeWrapper({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [showSplash, setShowSplash] = useState<boolean | null>(null);

  useEffect(() => {
    const hasSeenSplash = sessionStorage.getItem('erpsplash_shown');
    if (!hasSeenSplash) {
      setShowSplash(true);
    } else {
      setShowSplash(false);
    }
  }, []);

  const handleSplashComplete = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('erpsplash_shown', 'true');
    }
    setShowSplash(false);
  };

  if (showSplash === null) {
    return <div className="min-h-screen bg-[#0E0E0E]" />;
  }

  return (
    <>
      <AnimatePresence mode="wait">
        {showSplash && (
          <ERPWelcomeSplash 
            key="welcome-splash"
            userName={session?.user?.name || session?.user?.email?.split('@')[0] || 'Operator'}
            role={session?.user?.role || 'User'}
            onComplete={handleSplashComplete} 
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={showSplash ? { opacity: 0, scale: 0.96, filter: 'blur(12px)' } : { opacity: 1, scale: 1, filter: 'blur(0px)' }}
        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
        transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
        className="w-full min-h-screen"
      >
        {children}
      </motion.div>
    </>
  );
}
