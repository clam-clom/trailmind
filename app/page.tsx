import SearchInput from '@/components/SearchInput'

export default function Home() {
  return (
    <main className="min-h-screen" style={{ background: '#e8edda' }}>
      {/* Nav bar */}
      <nav className="tm-nav">
        <div className="max-w-3xl mx-auto">
          <p className="logo-eyebrow mb-0.5">outdoor planner</p>
          <span className="logo-text">TrailMind</span>
        </div>
      </nav>

      {/* Center content */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-24">
        <div className="w-full max-w-xl text-center mb-10">
          <h1
            className="mb-3 leading-tight"
            style={{
              fontFamily: 'var(--font-playfair), Playfair Display, serif',
              fontWeight: 700,
              fontSize: 'clamp(26px, 5vw, 36px)',
              color: '#0D3323',
            }}
          >
            Tell me what you&apos;re looking for.
          </h1>
          <p
            className="text-sm"
            style={{ color: '#4a6858', fontFamily: 'Comfortaa, sans-serif', fontWeight: 300 }}
          >
            Hiking, backpacking &amp; kayaking across NY, NJ, CT &amp; PA
          </p>
        </div>

        <div className="w-full max-w-xl">
          <SearchInput autoFocus />
        </div>

        <p
          className="mt-10 text-xs"
          style={{ color: '#5a7860', fontFamily: 'Comfortaa, sans-serif', fontWeight: 300 }}
        >
          Real trails. Honest suggestions. No account required.
        </p>
      </div>
    </main>
  )
}
