'use client';

export default function ModuleSkeleton({ title = "Loading Module..." }: { title?: string }) {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Header Skeleton */}
      <div className="border-b border-neutral-900 bg-[#121212] px-4 py-4 sm:px-6">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-neutral-800 animate-pulse" />
            <div className="h-6 w-48 bg-neutral-800 rounded-lg animate-pulse" />
          </div>
          <div className="w-24 h-8 bg-neutral-800 rounded-xl animate-pulse" />
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* KPI Strip Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-[#141414] rounded-2xl border border-neutral-800/80 p-4 space-y-3 animate-pulse">
              <div className="w-8 h-8 rounded-xl bg-neutral-800" />
              <div className="h-5 w-24 bg-neutral-800 rounded" />
            </div>
          ))}
        </div>

        {/* Form / Table Card Skeleton */}
        <div className="bg-[#141414] rounded-2xl border border-neutral-800/80 p-6 space-y-4 animate-pulse">
          <div className="h-7 w-64 bg-neutral-800 rounded-lg" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-12 bg-neutral-800/60 rounded-xl" />
            ))}
          </div>
          <div className="h-40 bg-neutral-800/40 rounded-xl mt-4" />
        </div>
      </div>
    </div>
  );
}
