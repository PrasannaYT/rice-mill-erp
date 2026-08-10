import LoginForm from '@/components/LoginForm';

export const metadata = {
  title: 'Sign In – Rice Mill ERP',
};

export default function LoginPage() {
  return (
    <div className="min-h-screen relative overflow-hidden flex">

      {/* ── Animated background ── */}
      <div className="absolute inset-0 z-0" aria-hidden>
        {/* Gold diagonal stripe pattern */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              repeating-linear-gradient(
                -45deg,
                transparent,
                transparent 40px,
                rgba(245,166,35,0.07) 40px,
                rgba(245,166,35,0.07) 41px
              )
            `,
            backgroundColor: 'var(--bg)',
          }}
        />
        {/* Large bold grain texture block top-right */}
        <div
          className="absolute -top-20 -right-20 w-[480px] h-[480px] rotate-12 rounded-none"
          style={{
            background: 'var(--gold)',
            opacity: 0.12,
            border: '3px solid var(--border)',
          }}
        />
        {/* Bottom left accent block */}
        <div
          className="absolute -bottom-16 -left-16 w-64 h-64"
          style={{
            background: 'var(--green)',
            opacity: 0.08,
            border: '3px solid var(--border)',
          }}
        />
      </div>

      {/* ── Left panel (desktop only) ── */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-[var(--charcoal)] p-12 relative z-10 border-r-4 border-[var(--gold)]">
        <div>
          <div
            className="inline-block px-3 py-1 text-xs font-display font-bold uppercase tracking-widest mb-12"
            style={{ background: 'var(--gold)', color: 'var(--ink)', border: '2px solid var(--ink)', boxShadow: '3px 3px 0 var(--ink)' }}
          >
            OPERATIONS PLATFORM
          </div>
          <h2 className="font-display font-black text-5xl leading-tight text-white">
            Harvest.<br />
            Mill.<br />
            <span className="text-[var(--gold)]">Profit.</span>
          </h2>
          <p className="mt-6 text-white/50 text-base leading-relaxed max-w-sm">
            An industrial-grade ERP system built for rice mill operations. Manage procurement, payroll, vehicles, inventory, and reports in one place.
          </p>
        </div>

        <div className="space-y-3">
          {['Procurement & Weighbridge', 'Hamali Payroll & Ledgers', 'Vehicle Fleet Management', 'Advanced Analytics'].map((feat) => (
            <div key={feat} className="flex items-center gap-3">
              <div className="w-2 h-2 bg-[var(--gold)] shrink-0" />
              <span className="text-white/70 text-sm font-medium">{feat}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel (form) ── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 relative z-10">
        <div
          className="w-full max-w-md bg-[var(--surface)] p-8 sm:p-10"
          style={{
            border: '3px solid var(--border)',
            boxShadow: '8px 8px 0px var(--border)',
            borderRadius: '4px',
          }}
        >
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
