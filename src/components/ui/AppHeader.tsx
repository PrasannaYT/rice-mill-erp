'use client';

import Link from 'next/link';
import { ArrowLeft, LogOut, Wifi, WifiOff, Wheat } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  /** If omitted, defaults to /dashboard */
  backHref?: string;
  /** Omit to hide back button (e.g. dashboard) */
  showBack?: boolean;
  /** Breadcrumb items shown between back button and title */
  breadcrumbs?: BreadcrumbItem[];
  /** Optional icon rendered next to title */
  icon?: React.ReactNode;
  /** Optional right-side slot — CTAs, export buttons, etc */
  actions?: React.ReactNode;
  /** Whether to show the ERP logo (dashboard only) */
  showLogo?: boolean;
  /** Override online status display (for client components that track it) */
  isOnline?: boolean | null;
}

const ROLE_COLOR: Record<string, string> = {
  ADMIN: 'bg-red-950/60 text-red-300 border-red-900/60',
  MANAGER: 'bg-purple-950/60 text-purple-300 border-purple-900/60',
  ACCOUNTANT: 'bg-sky-950/60 text-sky-300 border-sky-900/60',
  WEIGHBRIDGE_OPERATOR: 'bg-amber-950/60 text-amber-300 border-amber-900/60',
  FLOOR_MANAGER: 'bg-emerald-950/60 text-emerald-300 border-emerald-900/60',
};

const ROLE_SHORT: Record<string, string> = {
  ADMIN: 'Admin',
  MANAGER: 'Mgr',
  ACCOUNTANT: 'Acct',
  WEIGHBRIDGE_OPERATOR: 'WB Op',
  FLOOR_MANAGER: 'Floor',
};

import { useState, useEffect } from 'react';

export function AppHeader({
  title,
  subtitle,
  backHref = '/dashboard',
  showBack = true,
  breadcrumbs,
  icon,
  actions,
  showLogo = false,
  isOnline = null,
}: AppHeaderProps) {
  const { data: session } = useSession();
  const role = session?.user?.role ?? '';
  const name = session?.user?.name ?? '';

  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    setCurrentDate(formatter.format(new Date()));
  }, []);

  return (
    <header className="sticky top-0 z-[45] bg-[#0A0A0A]/95 backdrop-blur-md border-b border-[#F5A623]/20 transform-gpu will-change-transform">
      <div className="max-w-[1400px] mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">

        {/* ── LEFT: Logo / Back / Breadcrumbs ── */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">

          {showLogo ? (
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="w-8 h-8 bg-[#F5A623] rounded-xl flex items-center justify-center shadow-lg shadow-[#F5A623]/20">
                <Wheat className="w-4 h-4 text-black" />
              </div>
              <div>
                <p className="font-black text-white text-sm leading-none tracking-tight">RICE MILL</p>
                <p className="text-[9px] font-black uppercase text-[#F5A623]/70 tracking-[0.2em]">ERP System</p>
              </div>
            </div>
          ) : showBack ? (
            <Link href={backHref} aria-label="Go back">
              <div className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-neutral-900 border border-neutral-800 rounded-xl hover:border-[#F5A623]/60 hover:bg-neutral-800 transition-all active:scale-95 shrink-0 group">
                <ArrowLeft className="w-4 h-4 text-[#F5A623] group-hover:text-[#F5A623]" />
              </div>
            </Link>
          ) : null}

          {/* Breadcrumbs (sm+) */}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-neutral-600 shrink-0">
              {breadcrumbs.map((bc, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  {bc.href ? (
                    <Link href={bc.href} className="hover:text-neutral-400 transition-colors">{bc.label}</Link>
                  ) : (
                    <span>{bc.label}</span>
                  )}
                  {i < breadcrumbs.length - 1 && <span className="text-neutral-700">/</span>}
                </span>
              ))}
              <span className="text-neutral-700">/</span>
            </div>
          )}

          {/* Title + Subtitle */}
          <div className="flex items-center gap-2 min-w-0">
            {icon && <div className="shrink-0 text-[#F5A623]">{icon}</div>}
            <div className="min-w-0">
              <h1 className="font-black text-white text-sm sm:text-base uppercase tracking-tight leading-none truncate">
                {title}
              </h1>
              {subtitle && (
                <p className="text-[10px] text-neutral-500 font-semibold hidden sm:block mt-0.5 truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Actions + Status + Role + User ── */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">

          {/* Page-level actions slot */}
          {actions && <div className="flex items-center gap-2">{actions}</div>}

          {/* Online status pill (only when explicitly provided) */}
          {isOnline !== null && (
            <div className="hidden sm:flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 px-2.5 py-1.5 rounded-full text-[10px] font-mono">
              {isOnline ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-emerald-400">Live</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  <span className="text-red-400">Offline</span>
                </>
              )}
            </div>
          )}

          {/* Current Date */}
          {currentDate && (
            <span className="inline-flex text-[9px] sm:text-[10px] font-semibold text-neutral-400 bg-neutral-900/50 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-full border border-neutral-800">
              {currentDate}
            </span>
          )}

          {/* Role badge */}
          {role && (
            <span className={`hidden sm:inline-flex text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${ROLE_COLOR[role] || 'bg-neutral-900 text-neutral-400 border-neutral-800'}`}>
              {ROLE_SHORT[role] || role}
            </span>
          )}

          {/* User name + Sign out (desktop) */}
          <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-neutral-800">
            {name && (
              <span className="text-[11px] text-neutral-400 font-semibold max-w-[80px] truncate">
                {name.split(' ')[0]}
              </span>
            )}
            <button
              onClick={() => void signOut({ callbackUrl: '/login' })}
              title="Sign out"
              className="flex items-center gap-1.5 text-neutral-500 hover:text-red-400 text-xs font-bold uppercase tracking-wide transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden lg:block">Sign out</span>
            </button>
          </div>

          {/* Sign out icon only (mobile) */}
          <button
            onClick={() => void signOut({ callbackUrl: '/login' })}
            className="sm:hidden p-2 text-neutral-600 hover:text-red-400 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Thin gold progress bar accent */}
      <div className="h-[2px] bg-gradient-to-r from-[#F5A623]/0 via-[#F5A623]/40 to-[#F5A623]/0" />
    </header>
  );
}
