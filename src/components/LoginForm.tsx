'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Lock, Mail, Wheat } from 'lucide-react';

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await signIn('credentials', {
        redirect: false,
        email: email.trim().toLowerCase(),
        password,
      });

      if (res?.error) {
        setError('Invalid email or password. Please try again.');
        setLoading(false);
      } else {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('erpsplash_shown');
          localStorage.setItem('ricemill_last_active_timestamp', Date.now().toString());
          window.location.href = '/dashboard';
        }
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.12 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'circOut' as const } }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full max-w-md space-y-8 p-8 bg-[#161618] rounded-2xl border border-white/10 shadow-2xl backdrop-blur-xl"
    >
      <motion.div variants={itemVariants} className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-2">
          <Wheat className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white font-display">
          Rice Mill ERP
        </h1>
        <p className="text-sm text-neutral-400">
          Sign in to access your mill management portal
        </p>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium text-center"
        >
          {error}
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <motion.div variants={itemVariants} className="space-y-1.5">
          <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@mill.com"
              required
              className="pl-10 bg-neutral-900/80 border-white/10 text-white placeholder:text-neutral-600 focus:border-amber-500/50"
            />
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-1.5">
          <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="pl-10 bg-neutral-900/80 border-white/10 text-white placeholder:text-neutral-600 focus:border-amber-500/50"
            />
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="pt-2">
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold shadow-lg shadow-amber-500/10 transition-all cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Signing in...
              </span>
            ) : (
              'Sign In'
            )}
          </Button>
        </motion.div>
      </form>

      <motion.div variants={itemVariants} className="pt-4 border-t border-white/5 text-center text-xs text-neutral-500">
        Enterprise Rice Mill Operations & Inventory System
      </motion.div>
    </motion.div>
  );
}
