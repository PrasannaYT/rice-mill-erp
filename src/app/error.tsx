'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    console.error('App Route Error:', error);
  }, [error]);

  const handleRetry = () => {
    setIsRetrying(true);
    try {
      reset();
    } catch {
      // fallback
    }
    // Hard refresh to clear any stagnant serverless connection states or router caches
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#141414] border border-neutral-800 rounded-2xl p-6 text-center space-y-5 shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-white font-display">
            Module Loading Temporarily Delayed
          </h2>
          <p className="text-xs text-neutral-400">
            The server or database connection experienced a brief timeout. Click retry to reload instantly.
          </p>
        </div>

        <button
          onClick={handleRetry}
          disabled={isRetrying}
          className="w-full py-3 bg-[#F5A623] hover:bg-[#e0951c] text-black font-black rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
          {isRetrying ? 'Reloading Module...' : 'Retry Loading Module'}
        </button>
      </div>
    </div>
  );
}
