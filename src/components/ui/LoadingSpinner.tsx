'use client';

import { motion } from 'framer-motion';

export function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full gap-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-black/30 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl p-8 flex flex-col items-center gap-6"
      >
        <div className="relative w-16 h-16">
          <motion.div
            className="absolute inset-0 border-4 border-[var(--primary)] border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute inset-2 border-4 border-amber-300 border-b-transparent rounded-full opacity-60"
            animate={{ rotate: -360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          />
        </div>
        <motion.p
          className="text-white font-bold tracking-[0.2em] uppercase text-sm"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          Loading
        </motion.p>
      </motion.div>
    </div>
  );
}
