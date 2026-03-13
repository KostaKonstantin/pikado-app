export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-accent mb-4">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-white fill-white">
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="12" r="4" fill="none" stroke="white" strokeWidth="1.5" />
              <circle cx="12" cy="12" r="7" fill="none" stroke="white" strokeWidth="1.5" />
              <circle cx="12" cy="12" r="10" fill="none" stroke="white" strokeWidth="1" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">Pikado</h1>
          <p className="text-slate-400 mt-1">Darts Platforma za Klubove</p>
        </div>
        {children}
      </div>
    </div>
  );
}
