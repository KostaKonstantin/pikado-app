export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-bg min-h-screen flex items-center justify-center p-4 relative overflow-hidden">

      {/* Decorative rings — purely visual */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border pointer-events-none opacity-[0.04]"
        style={{ borderColor: 'var(--accent)' }}
      />
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full border pointer-events-none opacity-[0.025]"
        style={{ borderColor: 'var(--accent)' }}
      />

      <div className="w-full max-w-md relative z-10 animate-fade-in-up">
        {/* Logo block */}
        <div className="text-center mb-8">
          <div className="relative inline-block mb-5">
            {/* Glow ring */}
            <div className="absolute inset-0 rounded-2xl blur-xl opacity-40 gradient-accent scale-110" />
            <div className="relative w-16 h-16 rounded-2xl gradient-accent flex items-center justify-center shadow-lg shadow-orange-500/25">
              <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white">
                <circle cx="12" cy="12" r="1.8" />
                <circle cx="12" cy="12" r="4.5" fill="none" stroke="white" strokeWidth="1.5" />
                <circle cx="12" cy="12" r="7.5" fill="none" stroke="white" strokeWidth="1.25" />
                <circle cx="12" cy="12" r="10.5" fill="none" stroke="white" strokeWidth="0.8" strokeDasharray="2 1.5" />
              </svg>
            </div>
          </div>
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            Pikado
          </h1>
          <p className="mt-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Darts Platforma za Klubove
          </p>
        </div>

        {children}
      </div>
    </div>
  );
}
