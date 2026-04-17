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
            <div className="absolute inset-0 rounded-2xl blur-xl opacity-30 bg-orange-500 scale-110" />
            <img
              src="/logo.svg"
              alt="Pikado"
              className="relative w-20 h-20 rounded-2xl shadow-lg shadow-orange-500/20"
            />
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
