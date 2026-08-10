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
        email,
        password,
      });

      if (res?.error) {
        setError('Invalid email or password. Please try again.');
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
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
      initial="visible"
      animate="visible"
      className="w-full"
    >
      {/* Logo & Title */}
      <motion.div variants={itemVariants} className="mb-8">
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-[var(--gold)] border-2 border-[var(--border)] flex items-center justify-center shadow-brutal">
            <Wheat className="w-6 h-6 text-[var(--text)]" />
          </div>
          <div>
            <div className="text-xs font-display font-bold uppercase tracking-[0.15em] text-[var(--muted)]">Operations</div>
            <div className="font-display font-black text-xl text-[var(--text)] leading-tight">Rice Mill ERP</div>
          </div>
        </div>
        <h1 className="font-display font-black text-3xl sm:text-4xl text-[var(--text)] leading-none">
          Welcome<br />
          <span className="text-[var(--gold)]">Back.</span>
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)] font-medium">
          Sign in to your operations dashboard
        </p>
      </motion.div>

      {/* Error Banner */}
      {error && (
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-5 p-3 bg-red-50 border-2 border-red-500 text-red-700 text-sm font-semibold font-display"
          style={{ boxShadow: '3px 3px 0px #991b1b' }}
        >
          ⚠ {error}
        </motion.div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <motion.div variants={itemVariants}>
          <Input
            label="Email Address"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="operator@mill.com"
            autoComplete="email"
            icon={<Mail className="w-4 h-4" />}
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <Input
            label="Password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            icon={<Lock className="w-4 h-4" />}
          />
        </motion.div>

        <motion.div variants={itemVariants} className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            className="w-full text-base"
          >
            {loading ? 'Signing in...' : 'Sign In →'}
          </Button>
        </motion.div>
      </form>

      <motion.p variants={itemVariants} className="mt-6 text-center text-xs text-[var(--muted)]">
        Rice Mill ERP · Secure Operations Platform
      </motion.p>
    </motion.div>
  );
}
