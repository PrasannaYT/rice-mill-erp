'use client';

import { motion } from 'framer-motion';
import { FastForward, Play, Pause, Volume2, VolumeX, Sparkles, Wheat, CheckCircle2, Cpu, ShieldCheck } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';

interface ERPWelcomeSplashProps {
  userName?: string;
  role?: string;
  onComplete?: () => void;
}

export default function ERPWelcomeSplash({ userName = 'Operator', role = 'ERP User', onComplete }: ERPWelcomeSplashProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  const triggerExit = useCallback(() => {
    if (isExiting) return;
    setIsExiting(true);
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('erpsplash_shown', 'true');
      }
      if (onComplete) onComplete();
    }, 750);
  }, [isExiting, onComplete]);

  // Lazy-load video only when component is visible (IntersectionObserver)
  useEffect(() => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !videoReady) {
          // Start loading the video only when the splash is visible
          video.preload = 'auto';
          video.load();
          setVideoReady(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [videoReady]);

  // Play video once it's ready, handle progress and auto-exit
  useEffect(() => {
    const video = videoRef.current;
    if (!videoReady || !video) return;

    // Start playback once enough data is buffered
    const handleCanPlay = () => {
      video.play().then(() => setIsPlaying(true)).catch(() => null);
    };

    // Force start exit transition at 8.25s so transition finishes right at 9s
    const auto9sTimer = setTimeout(() => {
      triggerExit();
    }, 8250);

    const handleTimeUpdate = () => {
      if (video && video.duration) {
        // Map progress bar over the 9-second window
        const currentMs = video.currentTime * 1000;
        const prog = Math.min(100, (currentMs / 9000) * 100);
        setProgress(prog);
      }
    };

    const handleEnded = () => {
      triggerExit();
    };

    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);

    // If video is already ready (cached), trigger immediately
    if (video.readyState >= 3) {
      handleCanPlay();
    }

    return () => {
      clearTimeout(auto9sTimer);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
    };
  }, [videoReady, triggerExit]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play().catch(() => null);
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const getStatusText = (prog: number) => {
    if (prog < 30) return '⚙️ Initializing Operations Platform...';
    if (prog < 65) return '📦 Loading Real-Time Inventory & Godown Engine...';
    if (prog < 95) return '💰 Synchronizing Ledgers & Cashbook...';
    return '✅ Rice Mill ERP Ready!';
  };

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, scale: 1 }}
      animate={isExiting ? { opacity: 0, scale: 1.25, filter: 'blur(30px)' } : { opacity: 1, scale: 1, filter: 'blur(0px)' }}
      transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-[100] bg-[#050507] text-white flex flex-col items-center justify-between p-4 sm:p-8 overflow-hidden select-none pointer-events-auto"
    >
      {/* HTML5 REAL MP4 VIDEO PLAYER BACKGROUND */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden>
        <video
          ref={videoRef}
          src="/give_that_video.mp4"
          preload="none"
          poster="/ricemill_theme_cinematic.png"
          playsInline
          muted={isMuted}
          className="w-full h-full object-cover filter brightness-105 contrast-105"
        />

        {/* Soft Video Overlay Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050507]/80 via-transparent to-[#050507]/50" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(5,5,7,0.4)_100%)]" />

        {/* Futuristic Scanlines Grid Overlay */}
        <div 
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(245,166,35,0.15) 3px, transparent 4px)`,
            backgroundSize: '100% 4px'
          }}
        />

        {/* FLOATING 3D PHOTOREALISTIC GOLDEN RICE GRAINS */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ perspective: '1000px' }}>
          {[...Array(20)].map((_, i) => {
            const width = 7 + (i % 4) * 2;
            const height = 20 + (i % 5) * 6;
            return (
              <motion.div
                key={i}
                initial={{ 
                  y: '115vh', 
                  x: `${(i * 5.2) % 95}vw`,
                  opacity: 0.35 + (i % 4) * 0.2,
                  scale: 0.7 + (i % 3) * 0.4,
                  rotateX: (i * 45) % 360,
                  rotateY: (i * 30) % 360,
                  rotateZ: (i * 60) % 360,
                }}
                animate={{ 
                  y: '-15vh', 
                  x: [`${(i * 5.2) % 95}vw`, `${((i * 5.2) % 95) + (i % 2 === 0 ? 3 : -3)}vw`, `${(i * 5.2) % 95}vw`],
                  rotateX: [(i * 45) % 360, ((i * 45) % 360) + 720],
                  rotateY: [(i * 30) % 360, ((i * 30) % 360) + 540],
                  rotateZ: [(i * 60) % 360, ((i * 60) % 360) + 360],
                }}
                transition={{ 
                  duration: 5 + (i % 4) * 1.5, 
                  repeat: Infinity, 
                  ease: 'linear',
                  delay: (i * 0.2)
                }}
                style={{
                  width: `${width}px`,
                  height: `${height}px`,
                  borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
                  background: 'radial-gradient(ellipse at 35% 35%, #FFFDF0 0%, #FFE082 25%, #F5A623 60%, #B7791F 100%)',
                  boxShadow: '0 0 18px rgba(245, 166, 35, 0.85), inset -2px -2px 4px rgba(0,0,0,0.5), inset 1.5px 1.5px 3px rgba(255,255,255,0.9)',
                  border: '1px solid rgba(255, 236, 179, 0.7)',
                }}
                className="absolute pointer-events-none backdrop-blur-[1px]"
              />
            );
          })}
        </div>
      </div>

      {/* TOP RIGHT CORNER: ONLY SKIP BUTTON */}
      <div className="w-full max-w-5xl z-20 flex justify-end pt-8 sm:pt-12 pr-4 sm:pr-8">
        <button
          type="button"
          onClick={() => {
            triggerExit();
          }}
          className="px-4 py-2 bg-neutral-900/90 hover:bg-[#F5A623] hover:text-black border border-white/25 text-xs font-black uppercase tracking-wider rounded-xl shadow-2xl transition-all flex items-center gap-2 active:scale-95 cursor-pointer backdrop-blur-xl text-neutral-200"
        >
          <span>Skip</span>
          <FastForward className="w-4 h-4" />
        </button>
      </div>

      {/* CENTRAL ULTRA-FROSTED GLASSMORPHISM CARD */}
      <div className="relative z-10 w-full max-w-2xl flex-1 flex flex-col items-center justify-center my-auto">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="w-full bg-black/30 border border-[#F5A623]/60 rounded-3xl p-6 sm:p-9 shadow-[0_16px_48px_rgba(0,0,0,0.5),0_0_60px_rgba(245,166,35,0.25)] backdrop-blur-md space-y-6 text-center relative overflow-hidden ring-1 ring-white/30"
        >
          {/* Top Glass Specular Shine Accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />

          {/* GLOWING PULSING 3D EMBLEM WITH ROTATING DASHED ORBIT RING */}
          <div className="relative inline-flex items-center justify-center my-1">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
              className="absolute -inset-3 rounded-full border-2 border-dashed border-[#F5A623]/80"
            />
            <motion.div
              initial={{ scale: 0.7, rotate: -15 }}
              animate={{ scale: [0.9, 1.08, 1], rotate: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-[#F5A623] via-amber-500 to-[#d48912] rounded-2xl flex items-center justify-center border-2 border-black shadow-2xl shadow-yellow-900/60"
            >
              <Wheat className="w-8 h-8 sm:w-10 sm:h-10 text-black" />
            </motion.div>
          </div>

          {/* Main Title & Subtitle */}
          <div className="space-y-1.5">
            <h1 className="font-display font-black text-3xl sm:text-4xl text-white tracking-wide leading-tight drop-shadow-md">
              Harvest. Mill. <span className="text-[#F5A623]">Profit.</span>
            </h1>
            <p className="text-xs sm:text-sm text-neutral-200 font-semibold max-w-md mx-auto drop-shadow-sm">
              Real-time procurement, weighbridge, inventory & financial intelligence.
            </p>
          </div>

          {/* User Welcome Tag */}
          <div className="pt-2 flex items-center justify-center gap-2 text-emerald-400 font-mono text-xs font-bold">
            <CheckCircle2 className="w-4 h-4" />
            <span>WELCOME, {userName.toUpperCase()} · SYSTEM ACTIVE</span>
          </div>

          {/* HIGH-TECH OPERATIONAL PROGRESS BAR & LIVE STATUS */}
          <div className="space-y-2.5 bg-black/50 p-4 rounded-2xl border border-white/20 backdrop-blur-2xl shadow-inner text-left">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-neutral-200 font-bold flex items-center gap-1.5 truncate max-w-[280px]">
                <Cpu className="w-3.5 h-3.5 text-[#F5A623] shrink-0" />
                <span className="truncate">{getStatusText(progress)}</span>
              </span>
              <span className="font-black text-[#F5A623] shrink-0">{Math.round(progress)}%</span>
            </div>

            {/* Dynamic Progress Bar Track */}
            <div className="h-2.5 w-full bg-black/80 rounded-full border border-white/20 overflow-hidden p-0.5 shadow-inner">
              <motion.div
                className="h-full bg-gradient-to-r from-[#F5A623] via-amber-400 to-emerald-400 rounded-full shadow-[0_0_10px_rgba(245,166,35,0.8)]"
                style={{ width: `${progress}%` }}
                transition={{ duration: 0.2 }}
              />
            </div>

            <div className="flex justify-between items-center text-[10px] text-neutral-300 font-mono pt-0.5">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> Operational Platform
              </span>
              <span>v2.4 Live System</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* BOTTOM PLAYBACK CONTROLS */}
      <div className="w-full max-w-2xl z-20 space-y-3 pt-2">
        <div className="flex justify-center items-center gap-3">
          {/* Mute/Unmute Button */}
          <button
            type="button"
            onClick={toggleMute}
            className="p-2.5 bg-black/80 hover:bg-neutral-800 border border-white/25 rounded-xl text-neutral-300 transition-all cursor-pointer backdrop-blur-xl shadow-lg"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-neutral-400" /> : <Volume2 className="w-4 h-4 text-[#F5A623]" />}
          </button>

          {/* Play/Pause Button */}
          <button
            type="button"
            onClick={togglePlay}
            className="p-2.5 bg-black/80 hover:bg-neutral-800 border border-white/25 rounded-xl text-neutral-300 transition-all cursor-pointer backdrop-blur-xl shadow-lg"
            title={isPlaying ? 'Pause Video' : 'Play Video'}
          >
            {isPlaying ? <Pause className="w-4 h-4 text-[#F5A623]" /> : <Play className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
